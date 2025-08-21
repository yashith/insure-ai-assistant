import logging
import random
from abc import ABC
from os import getenv
from typing import Literal
import json
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

from langchain.agents import Agent
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool

from agents.base_agent import BaseAgent, AgentState


logger = logging.getLogger(__name__)
@tool
def get_claim_details(claim_id: str, token: str = None) -> dict:
    """Get claim details from given claim id
    :param claim_id: claim id
    :return: claim details
    """
    # Validate claim ID format
    claim_id = claim_id.strip()
    if not claim_id.isdigit():
        return {"error": f"Invalid claim ID format: {claim_id}. Claim ID must be numeric"}
    if len(claim_id) < 5 or len(claim_id) > 10:
        return {"error": f"Invalid claim ID length: {claim_id}. Claim ID must be between 4-10 digits"}
    
    try:
        # Make API call to get claim details
        api = getenv("EXTERNAL_API_BASE_URL")+"/api/claim/claim-status"
        headers = {"Content-Type": "application/json"}

        if token:
            headers['Authorization'] = f"Bearer {token}"

        payload = {
            "claim_id": claim_id
        }

        # Prepare headers
        if token:
            headers['Authorization'] = f"Bearer {token}"
        response = requests.post(
            api,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            return {"error": f"Claim {claim_id} not found"}
        else:
            return {"error": f"API error: {response.status_code} - {response.text}"}

    except Exception as e:
        return {"error": f"Could not retrieve required data: {str(e)}"}
@tool
def submit_new_claim(policy_id: str, damage_description: str, vehicle: str, token: str = None) -> dict:
    """This Api is used to submit a new claim,
    :param policy_id: policy id associated with this claim
    :param damage_description: damage description about the vehicle
    :param vehicle: vehicle details
    :return: claim details
    """
    # Validate policy ID format
    policy_id = policy_id.strip()
    if not policy_id.isdigit():
        return {"error": f"Invalid Policy ID format: {policy_id}. Policy ID must be numeric"}
    if len(policy_id) < 5 or len(policy_id) > 10:
        return {"error": f"Invalid Policy ID length: {policy_id}. Policy ID must be between 4-10 digits"}
    
    # Validate required fields
    if not damage_description or not damage_description.strip():
        return {"error": "Damage description is required"}
    if not vehicle or not vehicle.strip():
        return {"error": "Vehicle details are required"}
    
    try:
        # Prepare request payload

        api = getenv("EXTERNAL_API_BASE_URL")+"/api/claim/create-claim"

        payload = {
            "policy_id": policy_id,
            "damage": damage_description.strip(),
            "vehicle": vehicle.strip()
        }
        
        # Prepare headers
        headers = {"Content-Type": "application/json"}
        if token:
            headers['Authorization'] = f"Bearer {token}"
            
        # Make API call to submit new claim
        response = requests.post(
            api,
            json=payload,
            headers=headers,
        )
        
        if response.status_code == 201 or response.status_code == 200:
            return response.json()
        else:
            return {"error": f"API error: {response.status_code} - {response.text}"}

    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}

class ApiToolAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.tools = [get_claim_details,submit_new_claim]
        self.llm = self.llm.bind_tools(self.tools)

        self.api_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an API interaction agent for an insurance system.
                    Your job is to prepare and execute API calls based on user requests.
                    check available tools to use and ask for required details if needed

                    Based on the user's request, determine:
                    1. Which tool to call
                    2. What parameters are needed
                    3. If you need to ask for more information

                    User Request: {query}
                    Context: {context}

                    Respond with either:
                    - A request for more information (if needed)
                    - API call confirmation (before executing)
                    - API results (after executing summarize api response in a human-readable format).
                    
                    DO not respond confirming Api invocation.
                    Do not ask for confirmation.
                    """),
            ("human", "{query}")
        ])


    async def process(self, state: AgentState) -> AgentState:
        """Process API requests using tool calling"""
        try:
            logger.info(f"ApiToolAgent processing for session {state['session_id']}")

            # Get the latest user message
            user_message = None
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    user_message = msg.content
                    break

            if not user_message:
                state["error"] = "No user message found for API interaction"
                return state

            # Use the API prompt to process the message with context
            formatted_messages = self.api_prompt.format_messages(
                query=user_message,
                context=json.dumps(state["context"], default=str)
            )
            
            # Let LLM with tools process the formatted message
            response = await self.llm.ainvoke(formatted_messages)

            # Handle tool calls if any
            if hasattr(response, 'tool_calls') and response.tool_calls:
                # Execute tool calls
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    
                    # Add token from state to tool arguments if available
                    tool_args["token"] = state["token"]

                    # Find and execute the tool
                    for tool in self.tools:
                        if tool.name == tool_name:
                            try:
                                tool_result = tool.invoke(tool_args)
                                # Update response with tool result
                                state["context"][tool_name] = tool_result
                                # response.content += f"\n\nBased on the claim lookup: {tool_result}"
                            except Exception as e:
                                logger.error(f"Tool execution error: {e}")
                                response.content += f"\n\nError retrieving claim details: {str(e)}"

                state["current_step"] = "api_completed"
            else:
            # Add response to messages
                state["messages"].append(response)
                state["current_step"] = "api_processing"

            logger.info(f"API tool processing completed for session {state['session_id']}")

        except Exception as e:
            logger.error(f"Error in ApiToolAgent: {e}")
            state["error"] = f"API tool interaction failed: {str(e)}"

        return state

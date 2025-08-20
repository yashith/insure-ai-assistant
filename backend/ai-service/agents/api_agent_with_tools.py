import logging
import random
from abc import ABC
from typing import Literal
import json

from langchain.agents import Agent
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool

from agents.base_agent import BaseAgent, AgentState


logger = logging.getLogger(__name__)

@tool
def get_claim_details(claim_id: str) -> dict:
    """Get claim details from given claim id
    :param claim_id: claim id
    :return: claim details
    """
    # Mock claim database - replace with actual API call
    claims_db = {
        "12345": {"status": "Processing", "amount": "$2,500", "last_updated": "2024-01-15"},
        "67890": {"status": "Approved", "amount": "$1,200", "last_updated": "2024-01-10"},
        "11111": {"status": "Under Review", "amount": "$3,800", "last_updated": "2024-01-12"}
    }
    return claims_db.get(claim_id, {"error": f"Claim {claim_id} not found"})
@tool
def submit_new_claim(policy_id: str, damage_discription:str,vehicle:str) -> dict:
    """This Api is used to submit a new claim,
    Must confirm inputs by user before executing
    :param policy_id: policy id associated with this claim
    :param damage_description: damage description about the vehicle
    :param vehicle: vehicle details
    :return: claim details
    """
    # Mock claim database - replace with actual API call
    response_db = [
        { "claim_id": "12345", "message": "Claim submitted successfully." },
        {"claim_id": "11222", "message": "Claim submitted successfully."},
        {"claim_id": "12342", "message": "Claim submitted successfully."},
    ]
    return random.choice(response_db)

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
                    - API results (after executing summarize api response in a human-readable format)"""),
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

                    # Find and execute the tool
                    for tool in self.tools:
                        if tool.name == tool_name:
                            try:
                                tool_result = tool.invoke(tool_args)
                                # Update response with tool result
                                state["context"] = tool_result
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

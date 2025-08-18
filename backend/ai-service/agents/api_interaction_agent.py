import logging

import httpx
from typing import Dict, Any, Optional
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
import re

from agents.base_agent import BaseAgent, AgentState

logger = logging.getLogger(__name__ )

class APIInteractionAgent(BaseAgent):
    """Agent responsible for interacting with external APIs"""

    def __init__(self, api_base_url: str, **kwargs):
        super().__init__(**kwargs)
        self.api_base_url = api_base_url
        self.client = httpx.AsyncClient()

        self.api_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an API interaction agent for an insurance system.
            Your job is to prepare and execute API calls based on user requests.

            Available APIs:
            1. GET /claims/{claim_id} - Get claim status
            2. POST /claims - Submit new claim
            3. POST /premium - Calculate premium changes

            Based on the user's request, determine:
            1. Which API to call
            2. What parameters are needed
            3. If you need to ask for more information

            User Request: {query}
            Context: {context}

            Respond with either:
            - A request for more information (if needed)
            - API call confirmation (before executing)
            - API results (after executing)"""),
            ("human", "{query}")
        ])

    async def process(self, state: AgentState) -> AgentState:
        """Process API interaction request"""
        try:
            logger.info(f"APIInteractionAgent processing for session {state.session_id}")

            # Get the latest user message
            user_message = None
            for msg in reversed(state.messages):
                if isinstance(msg, HumanMessage):
                    user_message = msg.content
                    break

            if not user_message:
                state.error = "No user message found for API interaction"
                return state

            # Determine API action needed
            api_action = self._determine_api_action(user_message)

            if api_action["action"] == "need_info":
                # Need more information from user
                response = api_action["message"]
                state.messages.append(AIMessage(content=response))
                state.needs_confirmation = False
                state.current_step = "awaiting_info"

            elif api_action["action"] == "confirm":
                # Need confirmation before API call
                state.pending_action = api_action
                state.needs_confirmation = True
                state.messages.append(AIMessage(content=api_action["message"]))
                state.current_step = "awaiting_confirmation"

            elif api_action["action"] == "execute":
                # Execute API call
                result = await self._execute_api_call(api_action)
                state.messages.append(AIMessage(content=result["message"]))
                state.context.update(result.get("data", {}))
                state.current_step = "api_completed"

        except Exception as e:
            logger.error(f"Error in APIInteractionAgent: {e}")
            state.error = f"API interaction failed: {str(e)}"

        return state

    def _determine_api_action(self, query: str) -> Dict[str, Any]:
        """Determine what API action is needed"""
        query_lower = query.lower()

        # Check claim status
        if any(phrase in query_lower for phrase in ["check claim", "claim status", "status of claim"]):
            claim_id = self._extract_claim_id(query)
            if claim_id:
                return {
                    "action": "confirm",
                    "api": "get_claim_status",
                    "params": {"claim_id": claim_id},
                    "message": f"You've requested to check the status for claim ID {claim_id}. Shall I proceed?"
                }
            else:
                return {
                    "action": "need_info",
                    "message": "I can check the status of your claim. Can you provide your claim ID?"
                }

        # Submit new claim
        elif any(phrase in query_lower for phrase in ["submit claim", "new claim", "file claim"]):
            return {
                "action": "need_info",
                "message": "I can help you submit a new claim. Please provide:\n1. Your policy ID\n2. Vehicle details (make, model, year)\n3. Description of the damage\n4. Any photos (optional)"
            }

        # Calculate premium
        elif any(phrase in query_lower for phrase in ["calculate premium", "premium change", "new coverage"]):
            return {
                "action": "need_info",
                "message": "I can help calculate your new premium. Please provide:\n1. Your policy ID\n2. Current coverage amount\n3. Desired new coverage amount"
            }

        return {
            "action": "need_info",
            "message": "I'm not sure what API action you need. Could you clarify your request?"
        }

    def _extract_claim_id(self, text: str) -> Optional[str]:
        """Extract claim ID from text"""
        # Look for patterns like "claim ID 12345" or "claim 12345"
        patterns = [
            r'claim\s+id\s+(\w+)',
            r'claim\s+(\d+)',
            r'id\s+(\w+)',
            r'\b(\d{5,})\b'  # 5+ digit numbers
        ]

        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                return match.group(1)
        return None

    async def _execute_api_call(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the API call"""
        try:
            api = action["api"]
            params = action["params"]

            if api == "get_claim_status":
                response = await self.client.get(
                    f"{self.api_base_url}/claims",
                    params={"claim_id": params["claim_id"]}
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "message": f"Your claim (ID: {data['claim_id']}) is currently {data['status']}. Last updated: {data['last_updated']}.",
                        "data": data
                    }
                elif response.status_code == 404:
                    return {
                        "message": f"Claim ID {params['claim_id']} was not found. Please check the ID and try again.",
                        "data": {}
                    }
                else:
                    return {
                        "message": "There was an error checking your claim status. Please try again later.",
                        "data": {}
                    }

            # Add other API implementations here

        except Exception as e:
            logger.error(f"API call execution failed: {e}")
            return {
                "message": "There was an error processing your request. Please try again later.",
                "data": {}
            }

    def is_api_query(self, query: str) -> bool:
        """Determine if query requires API interaction"""
        api_keywords = [
            "check claim", "claim status", "submit claim", "new claim",
            "file claim", "calculate premium", "premium change"
        ]
        return any(keyword in query.lower() for keyword in api_keywords)
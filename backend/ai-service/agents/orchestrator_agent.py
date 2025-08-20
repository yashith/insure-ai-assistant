import json
import logging
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from enum import Enum

from agents.base_agent import BaseAgent, AgentState
from agents.knowledge_retrieval_agent import KnowledgeRetrievalAgent
from agents.api_interaction_agent import APIInteractionAgent


logger = logging.getLogger(__name__)

class QueryType(Enum):
    KNOWLEDGE = "knowledge"
    API = "api"
    GENERAL = "general"
    CONFIRMATION = "confirmation"


class OrchestratorAgent(BaseAgent):
    """Main orchestrator agent that routes queries to appropriate specialized agents"""

    def __init__(self, knowledge_agent: KnowledgeRetrievalAgent, api_agent: APIInteractionAgent, **kwargs):
        super().__init__(**kwargs)
        self.knowledge_agent = knowledge_agent
        self.api_agent = api_agent

        self.routing_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an orchestrator for an insurance AI assistant.
            Analyze the user's message and determine the best routing strategy.

            Consider:
            1. Is this a knowledge question about policies, coverage, or procedures?
            2. Is this an API request for claims, status checks, or calculations?
            3. Is this a confirmation response (yes/no)?
            4. Is this a general conversation?

            Current context: {context}
            User message: {message}

            Respond with your routing decision and reasoning."""),
            ("human", "{message}")
        ])

        self.fallback_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful insurance customer service assistant.
            The user's query couldn't be handled by specialized agents.
            Provide a helpful, conversational response.

            If appropriate, guide them toward specific actions like:
            - Asking about their insurance policy
            - Checking claim status
            - Submitting a new claim

            User message: {message}
            Context: {context}"""),
            ("human", "{message}")
        ])

    async def process(self, state: AgentState) -> AgentState:
        """Orchestrate the conversation flow"""
        try:
            logger.info(f"OrchestratorAgent processing for session {state.session_id}")

            # Get the latest user message
            user_message = None
            for msg in reversed(state.messages):
                if isinstance(msg, HumanMessage):
                    user_message = msg.content
                    break

            if not user_message:
                state.error = "No user message found"
                return state

            # Handle confirmation responses
            if state.needs_confirmation:
                return await self._handle_confirmation(state, user_message)

            # Determine query type and route accordingly
            query_type = self._classify_query(user_message, state.context)

            if query_type == QueryType.KNOWLEDGE:
                state = await self.knowledge_agent.process(state)

            elif query_type == QueryType.API:
                state = await self.api_agent.process(state)

            else:
                # Handle with general conversational agent
                state = await self._handle_general_query(state, user_message)

            logger.info(f"Orchestration completed for session {state.session_id}")

        except Exception as e:
            logger.error(f"Error in OrchestratorAgent: {e}")
            state.error = f"Orchestration failed: {str(e)}"

        return state

    def _classify_query(self, query: str, context: Dict[str, Any]) -> QueryType:
        """Classify the type of user query"""
        query_lower = query.lower()

        # Check for confirmation words
        if any(word in query_lower for word in ["yes", "no", "confirm", "proceed", "cancel"]):
            return QueryType.CONFIRMATION

        # Check for API-related keywords
        if self.api_agent.is_api_query(query):
            return QueryType.API

        # Check for knowledge-related keywords
        if self.knowledge_agent.is_knowledge_query(query):
            return QueryType.KNOWLEDGE

        return QueryType.GENERAL

    async def _handle_confirmation(self, state: AgentState, user_message: str) -> AgentState:
        """Handle confirmation responses"""
        confirmation_words = ["yes", "y", "confirm", "proceed", "ok", "okay"]
        rejection_words = ["no", "n", "cancel", "stop"]

        if any(word in user_message.lower() for word in confirmation_words):
            # User confirmed, execute pending action
            if state.pending_action:
                if state.pending_action.get("api"):
                    # Execute API action
                    state.pending_action["action"] = "execute"
                    state = await self.api_agent._execute_api_call(state.pending_action)
                    response_msg = state.messages[-1] if state.messages else AIMessage(content="Action completed.")
                    if not isinstance(state.messages[-1], AIMessage):
                        state.messages.append(response_msg)
                else:
                    state.messages.append(AIMessage(content="Action completed successfully."))

            state.needs_confirmation = False
            state.pending_action = None
            state.current_step = "completed"

        elif any(word in user_message.lower() for word in rejection_words):
            # User rejected
            state.messages.append(AIMessage(content="Action cancelled. How else can I help you?"))
            state.needs_confirmation = False
            state.pending_action = None
            state.current_step = "cancelled"

        else:
            # Unclear response, ask for clarification
            state.messages.append(
                AIMessage(content="I didn't understand. Please respond with 'yes' to proceed or 'no' to cancel."))

        return state

    async def _handle_general_query(self, state: AgentState, user_message: str) -> AgentState:
        """Handle general conversational queries"""
        try:
            response = await self.llm.ainvoke(
                self.fallback_prompt.format_messages(
                    message=user_message,
                    context=json.dumps(state.context, default=str)
                )
            )

            state.messages.append(AIMessage(content=response.content))
            state.current_step = "general_response"

        except Exception as e:
            logger.error(f"Error in general query handling: {e}")
            state.messages.append(AIMessage(
                content="I'm here to help with your insurance needs. You can ask about your policies, check claim status, or submit new claims."
            ))

        return state
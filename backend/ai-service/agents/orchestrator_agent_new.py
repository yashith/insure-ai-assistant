import json
import logging
from enum import Enum

from langchain_core.messages import AIMessage
from langchain_core.prompts import ChatPromptTemplate

from agents.base_agent import BaseAgent, AgentState

logger = logging.getLogger(__name__)

class QueryType(Enum):
    KNOWLEDGE = "knowledge"
    API = "api"
    GENERAL = "general"
    CONFIRMATION = "confirmation"


class OrchestratorAgentNew(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

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
            fallback_prompt = self.fallback_prompt.format_messages( message=state["messages"], context=json.dumps(state['context'], default=str) )
            response = await self.llm.ainvoke(fallback_prompt)
            # response = await self.llm.ainvoke(state["messages"])


            state["messages"].append(AIMessage(content=response.content))
            # state.messages.append(AIMessage(content=response.content))
            # state.current_step = "general_response"

        except Exception as e:
            logger.error(f"Error in general query handling: {e}")
            state["messages"].append(AIMessage( content="I'm here to help with your insurance needs. You can ask about your policies, check claim status, or submit new claims." ))

        return state
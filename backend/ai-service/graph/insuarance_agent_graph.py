import logging
from typing import Dict, Any, TypedDict, Annotated, Sequence

from langgraph._internal._typing import TypedDictLikeV1, TypedDictLikeV2, DataclassLike
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END
import uuid

from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel

from agents.orchestrator_agent import OrchestratorAgent
from agents.knowledge_retrieval_agent import KnowledgeRetrievalAgent
from agents.api_interaction_agent import APIInteractionAgent
from agents.base_agent import AgentState

logger = logging.getLogger(__name__)
class InsuranceAgentGraph:
    """Main graph orchestrating the insurance AI agents"""

    def __init__(self, database_url: str, api_base_url: str):
        self.database_url = database_url
        self.api_base_url = api_base_url

        # Initialize agents
        self.knowledge_agent = KnowledgeRetrievalAgent(database_url)
        self.api_agent = APIInteractionAgent(api_base_url)
        self.orchestrator = OrchestratorAgent(self.knowledge_agent, self.api_agent)
        self.memory = MemorySaver()

        # Build the graph
        self.graph = self._build_graph()

        self.initial_state = None

    def _build_graph(self) -> CompiledStateGraph[
        TypedDictLikeV1 | TypedDictLikeV2 | DataclassLike | BaseModel | Any, Any, Any, Any]:
        """Build the LangGraph workflow"""

        # Define the graph
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("orchestrator", self._orchestrator_node)
        workflow.add_node("knowledge_retrieval", self._knowledge_node)
        workflow.add_node("api_interaction", self._api_node)
        workflow.add_node("end", self._end_node)

        # Set entry point
        workflow.set_entry_point("orchestrator")

        # Add edges
        workflow.add_conditional_edges(
            "orchestrator",
            self._route_decision,
            {
                "knowledge": "knowledge_retrieval",
                "api": "api_interaction",
                "end": "end"
            }
        )

        workflow.add_edge("knowledge_retrieval", "end")
        workflow.add_edge("api_interaction", "end")
        workflow.add_edge("end", END)

        return workflow.compile(checkpointer=self.memory)

    async def _orchestrator_node(self, state: AgentState) -> AgentState:
        """Orchestrator node"""
        return await self.orchestrator.process(state)

    async def _knowledge_node(self, state: AgentState) -> AgentState:
        """Knowledge retrieval node"""
        return await self.knowledge_agent.process(state)

    async def _api_node(self, state: AgentState) -> AgentState:
        """API interaction node"""
        return await self.api_agent.process(state)

    async def _end_node(self, state: AgentState) -> AgentState:
        """End node"""
        state.current_step = "complete"
        return state

    def _route_decision(self, state: AgentState) -> str:
        """Decide which path to take based on state"""
        if state.error:
            return "end"

        if state.current_step in ["complete", "general_response", "api_completed", "knowledge_retrieved"]:
            return "end"

        # This is simplified - in practice, the orchestrator would set routing info
        if "knowledge" in state.context:
            return "knowledge"
        elif "api" in state.context:
            return "api"
        else:
            return "end"

    async def process_message(self, user_id: str, message: str, session_id: str = None) -> Dict[str, Any]:
        """Process a user message through the agent graph"""

        if not session_id:
            session_id = str(uuid.uuid4())

        # Create initial state
        if not self.initial_state:
            self.initial_state = AgentState(
                messages=[],
                user_id=user_id,
                session_id=session_id,
                current_step="start",
                context={},
                needs_confirmation=False,
                pending_action=None,
                error=None
            )

        # Add user message
        from langchain_core.messages import HumanMessage
        from langchain_core.messages import AIMessage
        self.initial_state.messages.append(HumanMessage(content=message))
        config = {'configurable':{'thread_id':session_id}}
        try:
            # Run the graph
            result = await self.graph.ainvoke(self.initial_state,config = config)

            # Extract the AI response
            ai_response = None
            for msg in reversed(result["messages"]):
                if hasattr(msg, 'content') and msg.__class__.__name__ == 'AIMessage':
                    ai_response = msg.content
                    self.initial_state.messages.append(AIMessage(content=ai_response))
                    break

            return {
                "response": ai_response or "I'm sorry, I couldn't process your request.",
                "session_id": session_id,
                "needs_confirmation": result["needs_confirmation"],
                "metadata": {
                    "context": result["context"],
                    "step": result["current_step"],
                    "error": result["error"]
                }
            }

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            logger.error("Error processing message", exc_info=True)
            return {
                "response": "I'm sorry, there was an error processing your request. Please try again.",
                "session_id": session_id,
                "needs_confirmation": False,
                "metadata": {"error": str(e)}
            }
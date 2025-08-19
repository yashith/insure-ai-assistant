import logging
import os

from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.constants import START
from langgraph.graph import StateGraph
from langgraph.store.base import BaseStore
from langgraph.store.postgres import PostgresStore
from psycopg import Connection, AsyncConnection

from agents.base_agent import BaseAgent, AgentState
from agents.orchestrator_agent_new import OrchestratorAgentNew
from graph.insuarance_agent_graph import InsuranceAgentGraph

logger = logging.getLogger(__name__)


def ChatNode(state: AgentState, store: BaseStore) -> AgentState:
    system_message = "You are an assistant. Use context from previous communication: {context}"
    llm = ChatOpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url=os.getenv("OPENROUTER_BASE_URL"),
        model=os.getenv("MODEL_NAME"),
        temperature=0.8
    )
    # LLM expects a list of messages, not a dict
    response = llm.invoke(state["messages"])
    # Return new message (add_messages will handle accumulation)
    return {"messages": [response]}


class InsuranceAgentGraphNew():

    def __init__(self, database_url: str, api_base_url: str):
        self.database_url = database_url
        self.api_base_url = api_base_url
        self.orchestrator= OrchestratorAgentNew()

        # Initialize agents
        self.checkpointer = None
        # Build the graph
        self.graph = None
        # self.graph = self._build_graph()


    async def initialize(self):
        graph_builder = StateGraph(AgentState)
        connection_kwargs = {
            "autocommit": True,
            "prepare_threshold": 0,
        }
        conn = Connection.connect(self.database_url, **connection_kwargs)

        db_connection = await AsyncConnection.connect(
            self.database_url,
            **connection_kwargs
        )
        checkpointer = AsyncPostgresSaver(db_connection)
        # Setup checkpointer tables
        await checkpointer.setup()

        # graph_builder.add_node("ChatNode", ChatNode)
        graph_builder.add_node("Orchestrator", self._orchestrator_node)
        graph_builder.add_edge(START, "Orchestrator")
        # self.graph = graph_builder.compile(checkpointer=MemorySaver())
        self.graph = graph_builder.compile(checkpointer=checkpointer)


    async def _orchestrator_node(self, state: AgentState) -> AgentState:
        """Orchestrator node"""
        return await self.orchestrator.process(state)

    async def process_message(self, message:str, session_id:str):
        config = {'configurable':{'thread_id':session_id}}
        return await self.graph.ainvoke({
            "messages": [HumanMessage(message)],
            "user_id": "test_user",  # You should pass this as parameter
            "session_id": session_id,
            "current_step": "start",
            "context": {},
            "needs_confirmation": False,
            "pending_action": None,
            "error": None
        }, config=config)
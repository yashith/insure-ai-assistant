import json
import logging
from enum import Enum
from typing import Dict, Any, Literal, TypedDict
from pydantic import BaseModel

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.constants import START, END
from langgraph.graph import StateGraph
from langgraph.types import Command
from psycopg import Connection, AsyncConnection

from agents.api_interaction_agent import APIInteractionAgent
from agents.api_agent_with_tools import ApiToolAgent
from agents.base_agent import BaseAgent, AgentState
from agents.knowledge_retrieval_agent import KnowledgeRetrievalAgent

logger = logging.getLogger(__name__)

class QueryType(Enum):
    KNOWLEDGE = "knowledge"
    API = "api"
    API_TOOLS = "api_tools"  # Add new routing option for tool-based API calls
    GENERAL = "general"
    CONFIRMATION = "confirmation"


class RoutingDecision(BaseModel):
    """Model for LLM routing decisions"""
    agent: Literal["knowledge", "api", "fallback"] = "fallback"
    reasoning: str = "Default routing decision"


class OrchestratorAgentNew(BaseAgent):
    def __init__(self,database_url,api_base_url, **kwargs):
        super().__init__(**kwargs)

        self.api_tool_agent = ApiToolAgent()  # Initialize the tool-based API agent

        self.database_url = database_url
        self.api_base_url = api_base_url
        self.knowledge_agent = KnowledgeRetrievalAgent(database_url)
        self.api_agent = ApiToolAgent()

        # Initialize agents
        self.checkpointer = None
        # Build the graph
        self.graph = None
        # self.graph = self._build_graph()

        self.routing_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a routing agent for an insurance AI assistant.
            Analyze the user's message and determine which specialized agent should handle it.

            Available agents:
            - "knowledge": For questions about insurance policies, procedures, coverage types, and general information
            - "api": For checking claim status, submitting claims, or any requests involving specific customer data
            - "fallback": For general conversation, greetings, or when no specific agent is needed

            Agent Capabilities:
            KNOWLEDGE Agent:
            - Explains insurance policies and coverage
            - Answers questions about procedures and processes  
            - Provides general insurance information and definitions
            - Explains benefits, deductibles, and terms

            API Agent:
            - Looks up claim status using claim IDs
            - Submits new insurance claims
            - Processes customer-specific requests
            - Handles any request requiring customer data lookup

            Routing Rules:
            - Route to "knowledge" for informational questions
            - Route to "api" for data lookups or submissions
            - Route to "fallback" for greetings, thanks, or general conversation

            Current context: {context}
            User message: {message}

            Choose the most appropriate agent and provide your reasoning."""),
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

    async def initialize(self):
        graph_builder = StateGraph(AgentState)
        connection_kwargs = {
            "autocommit": True,
            "prepare_threshold": 0,
        }

        db_connection = await AsyncConnection.connect(
            self.database_url,
            **connection_kwargs
        )
        checkpointer = AsyncPostgresSaver(db_connection)
        # Setup checkpointer tables
        await checkpointer.setup()

        # graph_builder.add_node("ChatNode", ChatNode)
        graph_builder.add_node("orchestrator", self._orchestrator_node)
        graph_builder.add_node("knowledge_retrieval", self._knowledge_node)
        graph_builder.add_node("api_interaction", self._api_node)
        graph_builder.add_node("fallback", self._handle_general_query)

        graph_builder.add_edge(START, "orchestrator")

        graph_builder.add_conditional_edges(
            "orchestrator",
            self._route_decision,
            {
                "knowledge": "knowledge_retrieval",
                "api": "api_interaction",
                "fallback": "fallback",
                "end": END
            }
        )

        graph_builder.add_edge("knowledge_retrieval", END)
        graph_builder.add_edge("api_interaction", 'orchestrator')

        # self.graph = graph_builder.compile(checkpointer=MemorySaver())
        self.graph = graph_builder.compile(checkpointer=checkpointer)

        try:
            # Generate the graph visualization
            graph_png = self.graph.get_graph().draw_mermaid_png()

            # Save to file
            with open("insurance_agent_graph.png", "wb") as f:
                f.write(graph_png)
            logger.info("Graph visualization saved as insurance_agent_graph.png")

            # Also display if in Jupyter environment
            try:
                from IPython.display import Image, display
                display(Image(graph_png))
            except ImportError:
                # Not in Jupyter environment, just save the file
                pass

        except Exception as e:
            logger.error(f"Error generating graph visualization: {e}")

    async def _classify_query(self, state: AgentState) -> Command[Literal["knowledge", "api", "end"]]:
        """LLM-based routing decision"""
        try:
            # Check for completion conditions first
            if state["error"]:
                return Command(goto="end")

            if state["current_step"] in ["complete", "general_response", "api_completed", "knowledge_retrieved"]:
                return Command(goto="end")

            # Get the latest user message
            user_message = None
            if state["messages"]:
                for msg in reversed(state["messages"]):
                    if isinstance(msg, HumanMessage):
                        user_message = msg.content
                        break

            if not user_message:
                return Command(goto="end")

            # Use LLM with structured output for routing
            llm_with_structure = self.llm.with_structured_output(RoutingDecision)
            
            routing_decision = await llm_with_structure.ainvoke(
                self.routing_prompt.format_messages(
                    message=user_message,
                    context=json.dumps(state["context"], default=str)
                )
            )

            logger.info(f"LLM routing decision: {routing_decision.agent} - {routing_decision.reasoning}")
            
            # Update state context with routing decision for transparency
            state["context"]["routing_decision"] = {
                "agent": routing_decision.agent,
                "reasoning": routing_decision.reasoning
            }
            
            return Command(goto=routing_decision.agent)

        except Exception as e:
            logger.error(f"Error in LLM routing: {e}")
            # Fallback to end if routing fails
            return Command(goto="end")

    async def _orchestrator_node(self, state: AgentState) -> AgentState:
        """Orchestrator node"""
        return await self.process(state)

    async def _knowledge_node(self, state: AgentState) -> AgentState:
        """Knowledge retrieval node"""
        return await self.knowledge_agent.process(state)

    async def _api_node(self, state: AgentState) -> AgentState:
        """API interaction node"""
        return await self.api_agent.process(state)

    async def process(self, state: AgentState) -> AgentState:
        return state
        """Orchestrate the conversation flow"""
        user_message = state["messages"][-1].content

        if not user_message:
            state["error"] = "No user message found"
            return state
        if state["needs_confirmation"]:
            return await self._handle_confirmation(state, user_message)

        # Determine query type and route accordingly
        query_type = await self._classify_query(state)

        if query_type.goto == QueryType.KNOWLEDGE.value:
            state = await self.knowledge_agent.process(state)

        # elif query_type.goto == QueryType.API:
        #     state = await self.api_agent.process(state)
            
        elif query_type.goto == QueryType.API.value:
            state = await self.api_tool_agent.process(state)
            # Post-process and reformat the API tool response
            state = await self._format_api_tool_response(state)

        else:
            # Handle with general conversational agent
            state = await self._handle_general_query(state, user_message)

        return state


    async def _route_decision(self, state: AgentState) -> str:
        """Route decision directly usable in conditional branches"""
        try:
            # Check for error conditions first
            if state["error"]:
                return "end"


            # call fallback with api agent / knowledge agent
            if state["current_step"] in ["api_completed", "knowledge_retrieved"]:
                return "fallback"
            # Check if conversation is complete
            if state["current_step"] in ["complete", "general_response","api_processing"]:
                return "end"
            
            # Get the latest user message
            user_message = None
            if state["messages"]:
                for msg in reversed(state["messages"]):
                    if hasattr(msg, 'content'):
                        user_message = msg.content
                        break
            
            if not user_message:
                return "end"
            
            # Use LLM with structured output for routing
            llm_with_structure = self.llm.with_structured_output(RoutingDecision)
            
            routing_decision = await llm_with_structure.ainvoke(
                self.routing_prompt.format_messages(
                    message=user_message,
                    context=json.dumps(state["context"], default=str)
                )
            )
            
            logger.info(f"LLM routing decision: {routing_decision.agent} - {routing_decision.reasoning}")
            
            # Update state context with routing decision for transparency
            state["context"]["routing_decision"] = {
                "agent": routing_decision.agent,
                "reasoning": routing_decision.reasoning
            }
            
            # Map to available routes
            if routing_decision.agent == "knowledge":
                return "knowledge"
            elif routing_decision.agent == "api":
                return "api"
            else:
                return "fallback"
        
        except Exception as e:
            logger.error(f"Error in routing decision: {e}")
            return "fallback"

    def _is_tool_api_query(self, query: str) -> bool:
        """Check if query should use tool-based API handling"""
        # Route to ApiToolAgent for specific claim ID lookups
        tool_keywords = [
            "claim id", "claim number", "check claim", "claim status",
            "my claim", "claim details", "lookup claim"
        ]
        
        # Also check if query contains what looks like a claim ID (numbers)
        import re
        has_claim_id = re.search(r'\b\d{4,}\b', query)  # 4+ digit numbers
        
        return any(keyword in query for keyword in tool_keywords) or (
            has_claim_id and "claim" in query
        )

    async def _format_api_tool_response(self, state: AgentState) -> AgentState:
        """Format and enhance the API tool response"""
        try:
            if not state["messages"] or state["error"]:
                return state

            # Get the latest AI message (from ApiToolAgent)
            latest_message = state["messages"][-1]
            if not hasattr(latest_message, 'content'):
                return state

            raw_response = latest_message.content
            
            # Create a formatting prompt
            formatting_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a customer service representative for an insurance company.
                Reformat the following API response into a friendly, professional customer service response.
                
                Guidelines:
                1. Keep it Simple and short
                2. Present information clearly and organized
                3. If there's an error, provide helpful guidance
                
                Raw API Response: {raw_response}
                
                Reformat this into a professional customer service response:"""),
                ("human", "Please format this response for the customer")
            ])

            # Use the LLM to reformat the response
            formatted_response = await self.llm.ainvoke(
                formatting_prompt.format_messages(raw_response=raw_response)
            )

            # Replace the raw response with formatted one
            state["messages"][-1] = AIMessage(content=formatted_response.content)
            
            logger.info("API tool response formatted successfully")

        except Exception as e:
            logger.error(f"Error formatting API tool response: {e}")
            # If formatting fails, keep the original response
            
        return state


    async def _handle_confirmation(self, state: AgentState, user_message: str) -> AgentState:
        """Handle confirmation responses"""
        confirmation_words = ["yes", "y", "confirm", "proceed", "ok", "okay"]
        rejection_words = ["no", "n", "cancel", "stop"]

        if any(word in user_message.lower() for word in confirmation_words):
            # User confirmed, execute pending action
            if state['pending_action']:
                if state['pending_action'].get("api"):
                    # Execute API action
                    state['pending_action']["action"] = "execute"
                    state = await self.api_agent._execute_api_call(state['pending_action'])
                    response_msg = state['messages'][-1] if state['messages'] else AIMessage(content="Action completed.")
                    if not isinstance(state['messages'][-1], AIMessage):
                        state['messages'].append(response_msg)
                else:
                    state['messages'].append(AIMessage(content="Action completed successfully."))

            state['needs_confirmation ']= False
            state['pending_action ']= None
            state['current_step'] = "completed"

        elif any(word in user_message.lower() for word in rejection_words):
            # User rejected
            state['messages'].append(AIMessage(content="Action cancelled. How else can I help you?"))
            state['needs_confirmation'] = False
            state['pending_action'] = None
            state['current_step'] = "cancelled"

        else:
            # Unclear response, ask for clarification
            state['messages'].append(
                AIMessage(content="I didn't understand. Please respond with 'yes' to proceed or 'no' to cancel."))

        return state

    async def _handle_general_query(self, state ):
        try:
            user_message = state["messages"][-1].content
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

    async def process_message(self, message, session_id):
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
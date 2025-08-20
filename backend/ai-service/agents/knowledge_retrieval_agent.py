import logging
import os
from os import getenv

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
import asyncio

from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

from agents.base_agent import BaseAgent, AgentState

logger = logging.getLogger(__name__ )

class KnowledgeRetrievalAgent(BaseAgent):
    """Agent responsible for retrieving information from the knowledge base"""

    def __init__(self, connection_string: str, **kwargs):
        load_dotenv()
        super().__init__(**kwargs)
        self.api_key = getenv("OPENROUTER_API_KEY")
        self.embeddings = OpenAIEmbeddings()

        collection_name = "policy_documents"
        database_url = os.getenv("KNOWLEDGE_DB_URL")

        self.vector_store = PGVector(
            embeddings=OpenAIEmbeddings(),
            collection_name=collection_name,
            connection=database_url,
            use_jsonb=True,
        )
        self.retrieval_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a knowledge retrieval agent for an insurance company.
            Your job is to find and present relevant information from the knowledge base.

            Based on the user's query and the retrieved documents, provide a clear,
            accurate response about insurance policies, claims, or procedures.

            If the retrieved information doesn't fully answer the question, say so clearly.
            Always be factual and don't make up information.

            Retrieved Documents:
            {documents}

            User Query: {query}"""),
            ("human", "{query}")
        ])

    async def process(self, state: AgentState) -> AgentState:
        """Process knowledge retrieval request"""
        try:
            logger.info(f"KnowledgeRetrievalAgent processing for session {state["session_id"]}")

            # Get the latest user message
            user_message = None
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    user_message = msg.content
                    break

            if not user_message:
                state["error"] = "No user message found for knowledge retrieval"
                return state

            # Retrieve relevant documents
            docs = await self._retrieve_documents(user_message)

            # Format documents for prompt
            formatted_docs = "\n\n".join([
                f"Document {i + 1}:\nTitle: {doc.metadata.get('title', 'Unknown')}\nContent: {doc.page_content}"
                for i, doc in enumerate(docs)
            ])

            # Generate response using retrieved knowledge
            response = await self.llm.ainvoke(
                self.retrieval_prompt.format_messages(
                    documents=formatted_docs,
                    query=user_message
                )
            )

            # Update state
            state["messages"].append(AIMessage(content=response.content))
            state["context"]["retrieved_documents"] = [
                {
                    "title": doc.metadata.get("title", "Unknown"),
                    "content": doc.page_content[:200] + "...",
                    "metadata": doc.metadata
                }
                for doc in docs
            ]
            state["context"]["knowledge_retrieved"] = True
            state["current_step"] = "knowledge_retrieved"

            logger.info(f"Knowledge retrieval completed for session {state['session_id']}")

        except Exception as e:
            logger.error(f"Error in KnowledgeRetrievalAgent: {e}")
            state["error"] = f"Knowledge retrieval failed: {str(e)}"

        return state

    async def _retrieve_documents(self, query: str, k: int = 3) -> List[Document]:
        """Retrieve relevant documents from vector store"""
        try:
            docs = await asyncio.to_thread(
                self.vector_store.similarity_search,
                query,
                k=k
            )
            return docs
        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            return []

    def is_knowledge_query(self, query: str) -> bool:
        """Determine if query requires knowledge base lookup"""
        knowledge_keywords = [
            "policy", "coverage", "plan", "benefits", "deductible",
            "premium", "what is", "tell me about", "explain",
            "how does", "what does", "information about"
        ]
        return any(keyword in query.lower() for keyword in knowledge_keywords)
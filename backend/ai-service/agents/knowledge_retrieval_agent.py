import logging
from os import getenv
from typing import List, Dict, Any

from dotenv import load_dotenv
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import PGVector
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
import asyncio

from agents.base_agent import BaseAgent, AgentState

logger = logging.getLogger(__name__ )

class KnowledgeRetrievalAgent(BaseAgent):
    """Agent responsible for retrieving information from the knowledge base"""

    def __init__(self, connection_string: str, **kwargs):
        load_dotenv()
        super().__init__(**kwargs)
        self.api_key = getenv("OPENROUTER_API_KEY")
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small",api_key=self.api_key)
        #TODO test with connection string
        # self.vector_store = PGVector(
        #     connection_string=connection_string,
        #     embedding_function=self.embeddings,
        #     collection_name="insurance_knowledge"
        # )
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
            #Todo uncomment after pgvecor check
            """
            docs = await asyncio.to_thread(
                self.vector_store.similarity_search,
                query,
                k=k
            )
            """
            #TODO remove mock docs
            docs = [
                Document(
                    page_content="Insurance policies cover a variety of risks including health, property, and vehicles.",
                    metadata={"title": "Insurance Policy Overview", "source": "knowledge_base"}
                ),
                Document(
                    page_content="Claims can be filed online or through your insurance agent. Required documents include proof of loss and identification.",
                    metadata={"title": "Claims Process", "source": "knowledge_base"}
                ),
                Document(
                    page_content="Deductibles are the amount you pay out of pocket before your insurance coverage begins.",
                    metadata={"title": "Understanding Deductibles", "source": "knowledge_base"}
                )
            ]
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
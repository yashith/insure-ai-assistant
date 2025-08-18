from abc import ABC, abstractmethod
from os import getenv
from typing import Dict, Any, List, Optional

from dotenv import load_dotenv
from langchain_community.chat_models import ChatOpenAI
from pydantic import BaseModel
from langchain_core.messages import BaseMessage
import logging

logger = logging.getLogger(__name__)


class AgentState(BaseModel):
    """Base state for all agents"""
    messages: List[BaseMessage] = []
    user_id: str
    session_id: str
    current_step: str = ""
    context: Dict[str, Any] = {}
    needs_confirmation: bool = False
    pending_action: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BaseAgent(ABC):
    """Base class for all agents"""

    def __init__(self, llm: Optional[ChatOpenAI] = None):
        load_dotenv()
        self.llm = ChatOpenAI(
            api_key=getenv("OPENROUTER_API_KEY"),
            base_url=getenv("OPENROUTER_BASE_URL"),
            model=getenv("MODEL_NAME"),
            temperature=0.8
        )
        self.name = self.__class__.__name__

    @abstractmethod
    async def process(self, state: AgentState) -> AgentState:
        """Process the current state and return updated state"""
        pass

    def should_continue(self, state: AgentState) -> bool:
        """Determine if agent should continue processing"""
        return not state.error and state.current_step != "complete"

from os import getenv

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_core.language_models.llms import aget_prompts
from pydantic import BaseModel
from agents.retrieval_agent import get_retrieval_agent
from agents.api_agent import get_api_agent
from agents.fallback_agent import get_fallback_agent
from graph.chat_graph import build_chat_graph
from graph.insuarance_agent_graph import InsuranceAgentGraph

app = FastAPI()

# build LangGraph workflow
# graph = build_chat_graph(get_retrieval_agent, get_api_agent, get_fallback_agent)
agent_graph = InsuranceAgentGraph(
    database_url=getenv("DATABASE_URL"),
    api_base_url=getenv("EXTERNAL_API_BASE_URL")
)
load_dotenv()

class ChatRequest(BaseModel):
    userId: str
    role: str
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    print(req.userId, req.role, req.message)
    result = await agent_graph.process_message(
        user_id="test_user",
        message=req.message,
        session_id="example_session"
    )

    session_id = result["session_id"]
    print(f"AI: {result['response']}")

    if result["needs_confirmation"]:
        print("(Waiting for confirmation...)")

    print(f"Metadata: {result['metadata']}")
    # result = graph.invoke({"query": req.message})
    return {"reply": result["response"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
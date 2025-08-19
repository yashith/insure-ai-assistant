from contextlib import asynccontextmanager
from os import getenv

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_core.language_models.llms import aget_prompts
from pydantic import BaseModel

from agents.orchestrator_agent_new import OrchestratorAgentNew
from graph.insuarance_agent_graph import InsuranceAgentGraph
from graph.insuarance_agent_graph_new import InsuranceAgentGraphNew

# build LangGraph workflow
# graph = build_chat_graph(get_retrieval_agent, get_api_agent, get_fallback_agent)
agent_graph = OrchestratorAgentNew(
    database_url="postgresql://postgres:root@localhost:5432/postgres?sslmode=disable", #TODO move to env file
    api_base_url=getenv("EXTERNAL_API_BASE_URL")
)

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await agent_graph.initialize()
    yield
    # Clean up the ML models and release the resources

app = FastAPI(lifespan=lifespan)
class ChatRequest(BaseModel):
    userId: str
    role: str
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    print(req.userId, req.role, req.message)
    result = await agent_graph.process_message(
        message=req.message,
        session_id="example_session"
    )
    print(result)
    return {"message": result["messages"][-1].content}
    # session_id = result["session_id"]
    # print(f"AI: {result['response']}")
    #
    # if result["needs_confirmation"]:
    #     print("(Waiting for confirmation...)")
    #
    # print(f"Metadata: {result['metadata']}")
    # return {"reply": result["response"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
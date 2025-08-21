from contextlib import asynccontextmanager
from os import getenv
import os
import io
import uuid
import asyncio
import sys
import logging

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pypdf

from agents.orchestrator_agent_new import OrchestratorAgentNew
from util.pdf_processor import PdfDocumentEmbedder

# Fix asyncio event loop policy for Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)

agent_graph = OrchestratorAgentNew(
    database_url=getenv("DB_URL"),
    api_base_url=getenv("EXTERNAL_API_BASE_URL")
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    #initialize agent since async postgres connection is using
    await agent_graph.initialize()
    yield

app = FastAPI(lifespan=lifespan)
class ChatRequest(BaseModel):
    userId: str
    role: str
    token: str
    sessionId: str
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    result = await agent_graph.process_message(
        message=req.message,
        token= req.token,
        session_id=req.sessionId,
    )
    return {"message": result["messages"][-1].content}

@app.post("/upload-document")
async def upload_document(file: UploadFile):
    print(file.filename)
    try:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        file_content = await file.read()
        
        if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        # Create uploads directory if it doesn't exist
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(uploads_dir, unique_filename)

        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)

        fp = str(file_path)
        pdf_embedder = PdfDocumentEmbedder(file_path=str(file_path))
        pdf_embedder.insert_into_db("policy_documents")

        pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))

        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(file_content),
            "pages": len(pdf_reader.pages),
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

if __name__ == "__main__":
    print(f"port {int(getenv("PORT"))}")
    uvicorn.run(app, host="0.0.0.0", port=int(getenv("PORT")))
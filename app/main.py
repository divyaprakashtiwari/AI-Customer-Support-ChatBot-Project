from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import ChatRequest, ChatResponse
from app.chat import generate_answer

app = FastAPI(title="AI Customer Support Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://ai-customer-support-chat-bot-projec.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    result = generate_answer(request.message, session_id=request.session_id)
    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"]
    )
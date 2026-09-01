"""
DSA Evaluator Agent — FastAPI Service
Runs on port 5001. Called by Node.js backend after code submission.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from evaluator import evaluate_code
import uvicorn

app = FastAPI(
    title="DSA Code Evaluator Agent",
    description="LangGraph + Groq powered code evaluation service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluateRequest(BaseModel):
    code: str
    language: str = "python"
    problem_title: str
    problem_description: str
    difficulty: str = "medium"
    sample_input: Optional[str] = ""
    sample_output: Optional[str] = ""
    constraints: Optional[str] = ""

class EvaluateResponse(BaseModel):
    score: int          # 0-10
    feedback: str
    success: bool = True

@app.get("/health")
def health():
    return {"status": "ok", "service": "DSA Evaluator Agent"}

@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest):
    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    try:
        result = evaluate_code(
            code=req.code,
            language=req.language,
            problem_title=req.problem_title,
            problem_description=req.problem_description,
            difficulty=req.difficulty,
            sample_input=req.sample_input or "",
            sample_output=req.sample_output or "",
            constraints=req.constraints or "",
        )
        return EvaluateResponse(
            score=result["score"],
            feedback=result["feedback"],
            success=True,
        )
    except Exception as e:
        print(f"[Evaluator Error] {e}")
        # Fallback scoring if agent fails
        fallback_scores = {"easy": 6, "medium": 7, "hard": 8}
        fallback_score = fallback_scores.get(req.difficulty.lower(), 6)
        return EvaluateResponse(
            score=fallback_score,
            feedback="Your solution has been received! Keep practicing and improving your DSA skills.",
            success=False,
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)

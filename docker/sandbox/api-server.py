"""
Docker 沙箱 HTTP API 服务
提供 /execute 代码执行端点 + /health 健康检查
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import json
import os
import uuid

from executor import execute_code, validate_code_safety

app = FastAPI(title="SkillFlow Sandbox", version="2.0.0")

class ExecuteRequest(BaseModel):
    code: str = Field(..., description="要执行的代码")
    language: str = Field(default="python", description="编程语言")
    app_id: Optional[str] = Field(default=None, description="关联的应用ID")

class ExecuteResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    error: Optional[str] = None
    execution_time_ms: float

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "supported_languages": ["python", "html", "nodejs"]}

@app.post("/execute", response_model=ExecuteResponse)
async def execute(req: ExecuteRequest):
    """执行代码并返回结果"""
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    # 安全检查
    if req.language == "python" and not validate_code_safety(req.code):
        return ExecuteResponse(
            success=False,
            stdout="",
            stderr="",
            error="Code rejected: contains unsafe operations (os, subprocess, socket, eval, exec, etc.)",
            execution_time_ms=0
        )

    # 执行
    result = execute_code(req.code, req.language)

    # HTML 模式：直接返回代码（不需要执行）
    if req.language == "html":
        return ExecuteResponse(
            success=True,
            stdout=req.code,
            stderr="",
            error=None,
            execution_time_ms=0
        )

    return ExecuteResponse(**result)

@app.post("/validate")
async def validate(req: ExecuteRequest):
    """仅验证代码安全性，不执行"""
    is_safe = validate_code_safety(req.code)
    return {"safe": is_safe, "language": req.language}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("SANDBOX_PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)

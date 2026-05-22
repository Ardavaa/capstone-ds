"""FastAPI entrypoint for the interview analysis backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router

app = FastAPI(
    title="AI Interview Simulator API",
    description="Backend API for multimodal interview performance analysis.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Return a lightweight health check response.

    Returns:
        A status payload confirming the API is reachable.
    """

    return {"status": "ok"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.modules.proof.router import router as proof_router
from api.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Summarise API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_origin],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(proof_router)
    return app


app = create_app()

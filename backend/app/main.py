from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, portal

app = FastAPI(title="Core · Portal del Cliente API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portal.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}

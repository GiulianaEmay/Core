from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, empresas, usuarios

app = FastAPI(title="Core · Value OS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(empresas.router)
app.include_router(usuarios.router)


@app.get("/health")
def health():
    return {"status": "ok"}

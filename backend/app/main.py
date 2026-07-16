from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .auth import get_current_user
from .routers import datasets, missions, agents, settings, dashboard, cron

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Datalian Temps API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Toutes les routes métier exigent un jeton Supabase valide.
# /api/health reste public (utilisé pour vérifier que le serveur tourne).
authenticated = [Depends(get_current_user)]
app.include_router(datasets.router, dependencies=authenticated)
app.include_router(missions.router, dependencies=authenticated)
app.include_router(agents.router, dependencies=authenticated)
app.include_router(settings.router, dependencies=authenticated)
app.include_router(dashboard.router, dependencies=authenticated)

# Le cron a son propre secret (CRON_SECRET), pas un jeton Supabase :
# ce n'est pas un utilisateur connecté qui appelle cette route, mais Vercel.
app.include_router(cron.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}

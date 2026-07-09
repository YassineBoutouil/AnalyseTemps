"""
Point d'entrée serverless pour Vercel.

Vercel détecte automatiquement tout fichier .py sous api/ qui expose une
variable `app` de type ASGI (comme une app FastAPI) et le déploie comme
fonction serverless. On réutilise directement l'app définie dans app/main.py,
rien n'est dupliqué.
"""
from app.main import app  # noqa: F401

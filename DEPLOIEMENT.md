# Comment héberger le projet Datalian (Vercel + Supabase)

## Pourquoi pas "juste" un `vercel deploy` tel quel ?

Comme vu ensemble : le backend écrit dans un fichier SQLite (`datalian.db`) à chaque
upload de dataset. Sur Vercel, le code tourne dans des fonctions **serverless** :
système de fichiers en lecture seule, pas de processus permanent, donc ce fichier
ne survivrait pas d'une requête à l'autre.

**Solution : sortir la base de données du serveur.** On utilise **Supabase**, qui
héberge une vraie base **Postgres** accessible par le réseau, indépendamment de
Vercel. Le code a déjà été adapté pour ça (voir plus bas "Ce qui a changé dans le code").

## Architecture cible

```
                    ┌─────────────────────┐
navigateur  ──────► │  Vercel : frontend    │  (React/Vite, statique)
                    │  datalian_web/frontend│
                    └──────────┬───────────┘
                               │ appels API (VITE_API_URL)
                               ▼
                    ┌─────────────────────┐
                    │  Vercel : backend      │  (FastAPI, serverless)
                    │  datalian_web/backend  │
                    └──────────┬───────────┘
                               │ DATABASE_URL
                               ▼
                    ┌─────────────────────┐
                    │  Supabase (Postgres)   │  (données persistantes)
                    └─────────────────────┘
```

Deux projets Vercel séparés (un pour le frontend, un pour le backend) + un projet
Supabase pour la base. C'est le découpage le plus standard et le plus fiable pour
ce genre d'appli — chaque brique est déployée avec son propre outil.

---

## Ce qui a déjà été changé dans le code (fait)

- `backend/app/database.py` : lit `DATABASE_URL` depuis une variable d'environnement
  (Postgres en prod), avec `sqlite:///./datalian.db` par défaut si elle est absente
  (donc **ton développement local et Docker Compose ne changent pas du tout**).
- `backend/app/routers/datasets.py` : les fichiers uploadés sont écrits dans le
  dossier temporaire du système (`tempfile.gettempdir()`) au lieu de `./uploads`,
  qui n'est pas accessible en écriture sur Vercel.
- `backend/requirements.txt` : ajout de `psycopg2-binary`, le driver Python pour
  parler à Postgres.
- `backend/api/index.py` (nouveau) : point d'entrée que Vercel utilise pour
  transformer l'app FastAPI en fonction serverless. Il ne fait qu'importer
  `app` depuis `app/main.py` — aucune logique dupliquée.
- `backend/vercel.json` (nouveau) : dit à Vercel de rediriger **toutes** les routes
  vers cette fonction (sinon seul `/api/index` répondrait, pas `/api/datasets` etc.).
- `frontend/src/utils/api.js` : l'URL de base de l'API est maintenant
  `VITE_API_URL` si elle est définie, sinon `/api` comme avant (donc, encore une
  fois, rien ne change en local).
- `.gitignore` créé à la racine de `datalian_web/` (le projet n'était pas encore
  suivi par Git).

---

## Étape 0 : mettre le projet sur Git + GitHub

Vercel déploie à partir d'un dépôt Git. Le projet n'en a pas encore.

```powershell
cd "datalian_web"
git init
git add .
git commit -m "Initial commit"
```

Puis crée un dépôt vide sur [github.com/new](https://github.com/new) (public ou
privé, peu importe) et suis les instructions de GitHub pour le lier :

```powershell
git remote add origin https://github.com/<ton-user>/<ton-repo>.git
git branch -M main
git push -u origin main
```

---

## Étape 1 : créer la base sur Supabase

1. Va sur [supabase.com](https://supabase.com) → crée un compte (gratuit) → **New project**.
2. Choisis un nom, un mot de passe pour la base (garde-le précieusement), une région
   proche de toi.
3. Une fois le projet créé, va dans **Project Settings → Database**.
4. Copie la **Connection string**, mais choisis bien le mode **Transaction pooler**
   (port `6543`), **pas** la connexion directe (port `5432`). C'est important : les
   fonctions serverless ouvrent beaucoup de connexions courtes, et Postgres a un
   nombre limité de connexions directes possibles. Le pooler est fait pour ça.
5. La chaîne ressemble à :
   ```
   postgresql://postgres.xxxxxxxxxxxx:[MOT_DE_PASSE]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```
   Remplace `[MOT_DE_PASSE]` par le vrai mot de passe choisi à l'étape 2.

Tu n'as **rien d'autre** à faire côté Supabase : les tables (`datasets`, `agents`,
`missions`, `app_settings`) seront créées automatiquement au premier démarrage du
backend (`Base.metadata.create_all` dans `main.py`).

---

## Étape 2 : déployer le backend sur Vercel

1. Va sur [vercel.com](https://vercel.com) → connecte-toi avec GitHub → **Add New → Project**.
2. Choisis le dépôt que tu viens de pousser.
3. Dans la configuration du projet :
   - **Root Directory** → `datalian_web/backend`
   - **Framework Preset** → *Other* (Vercel détecte le Python tout seul grâce à `requirements.txt` et `api/index.py`)
4. Ouvre **Environment Variables** et ajoute :
   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne de connexion Supabase (étape 1) |
5. **Deploy**.
6. Une fois terminé, note l'URL donnée (ex. `https://datalian-backend.vercel.app`)
   et vérifie que ça marche :
   ```
   https://datalian-backend.vercel.app/api/health
   ```
   → doit répondre `{"status": "ok"}`. Si tu as une erreur 500, va voir les
   **Function Logs** dans le dashboard Vercel (onglet "Logs") pour le détail.

---

## Étape 3 : déployer le frontend sur Vercel

1. Retour sur Vercel → **Add New → Project** → même dépôt.
2. Configuration :
   - **Root Directory** → `datalian_web/frontend`
   - **Framework Preset** → *Vite* (auto-détecté)
3. **Environment Variables** :
   | Nom | Valeur |
   |---|---|
   | `VITE_API_URL` | `https://datalian-backend.vercel.app/api` (l'URL de l'étape 2, **avec** `/api` à la fin) |
4. **Deploy**.
5. Ouvre l'URL donnée (ex. `https://datalian-frontend.vercel.app`) → le dashboard
   doit s'afficher.

---

## Étape 4 : vérifier que tout fonctionne de bout en bout

- Ouvre le frontend déployé, va dans la section d'upload, envoie un `.xlsx` de test.
- Rafraîchis la page (ou ouvre-la sur un autre appareil) : le dataset doit toujours
  être là → preuve que ça persiste bien dans Supabase, contrairement à SQLite sur
  Vercel.
- Tu peux aussi vérifier directement dans Supabase : **Table Editor** → tables
  `datasets` / `missions` doivent contenir les lignes importées.

---

## Ce qui ne change pas

- **Développement local** (`.\.venv\Scripts\Activate.ps1` + `uvicorn` + `npm run dev`)
  fonctionne exactement comme avant, avec SQLite.
- **Docker Compose** (`docker-compose up`) fonctionne aussi exactement comme avant.

Les changements de code sont purement additifs (variables d'environnement avec
valeurs par défaut) — rien n'a été cassé pour l'usage local.

---

## Limites du plan gratuit à connaître

- **Vercel Hobby** : fonctions serverless limitées à 10s d'exécution par requête.
  Le parsing d'un `.xlsx` de ~1 Mo est rapide (bien en dessous), donc ça passe. Si
  un jour tu uploades des fichiers beaucoup plus gros, ça pourrait devenir un souci.
- **Supabase Free** : 500 Mo de base de données, le projet se met en pause après
  1 semaine d'inactivité totale (il suffit d'ouvrir le dashboard Supabase pour le
  réveiller).
- **CORS** : le backend autorise actuellement toutes les origines (`allow_origins=["*"]`
  dans `main.py`). Ça fonctionne mais ce n'est pas restrictif — tu peux, plus tard,
  le limiter à l'URL exacte du frontend déployé si tu veux durcir un peu.

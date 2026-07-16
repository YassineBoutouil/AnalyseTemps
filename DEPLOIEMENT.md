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

## Étape 5 : ajouter une authentification (Supabase Auth)

Les données uploadées contiennent des noms/prénoms de salariés → l'outil doit être
réservé aux personnes autorisées. On utilise **Supabase Auth**, déjà inclus dans
le projet Supabase créé à l'étape 1 (pas de nouveau service à créer).

### Principe

- Le frontend affiche un écran de connexion (email + mot de passe) tant que
  personne n'est identifié.
- Une fois connecté, chaque appel à l'API embarque un jeton fourni par Supabase
  (`Authorization: Bearer ...`).
- Le backend vérifie ce jeton avant de répondre à toute route (sauf `/api/health`,
  qui reste public pour les vérifications de disponibilité).
- **Il n'y a pas de page d'inscription** : c'est toi (admin) qui crées les comptes
  des personnes autorisées, directement depuis Supabase.

### Ce qui a été changé dans le code (fait)

- `backend/app/auth.py` (nouveau) : vérifie la signature et l'expiration du jeton
  envoyé par le frontend, à partir de la clé publique du projet Supabase
  (récupérée via `SUPABASE_URL`).
- `backend/app/main.py` : toutes les routes des routers (`datasets`, `missions`,
  `agents`, `settings`, `dashboard`) exigent désormais ce jeton. `/api/health`
  reste public.
- `backend/requirements.txt` : ajout de `pyjwt[crypto]` (vérification du jeton,
  y compris les signatures asymétriques) et `python-dotenv` (pour charger un
  fichier `.env` en local).
- `backend/.env.example` (nouveau) : modèle à copier en `.env` pour le
  développement local.
- `frontend/src/utils/supabaseClient.js` (nouveau) : connexion au projet
  Supabase depuis le frontend.
- `frontend/src/auth/AuthContext.jsx` (nouveau) : garde en mémoire qui est
  connecté, sur toute l'app.
- `frontend/src/pages/Login.jsx` (nouveau) : écran de connexion. Demande un
  simple identifiant (ex. `innovation`) + mot de passe, et reconstruit
  l'email `identifiant@datalian.local` en interne avant d'appeler Supabase.
- `frontend/src/App.jsx` : affiche l'écran de connexion tant que personne n'est
  identifié, sinon l'app comme avant.
- `frontend/src/components/Layout.jsx` : affiche l'email connecté + bouton
  "Déconnexion" dans la barre latérale.
- `frontend/src/utils/api.js` : ajoute automatiquement le jeton Supabase à
  chaque appel API.
- `frontend/.env.example` (nouveau) : modèle à copier en `.env.local` pour le
  développement local.
- `frontend/package.json` : ajout de la dépendance `@supabase/supabase-js`.

Testé en local avec un vrai compte Supabase et un vrai jeton (pas seulement un
jeton fabriqué à la main) : `/api/health` répond sans jeton, les autres routes
répondent 401 sans jeton ou avec un jeton invalide, et 200 avec le jeton réel
délivré par Supabase après connexion.

> **Détail technique découvert en testant** : ce projet Supabase signe ses
> jetons avec une clé asymétrique (ES256), pas avec l'ancien "JWT Secret"
> partagé. `auth.py` vérifie donc le jeton via la clé **publique** du projet
> (récupérée automatiquement à l'adresse
> `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`) plutôt qu'avec un secret à
> stocker côté serveur. Résultat : plus simple qu'initialement prévu, le
> backend n'a besoin de connaître qu'une seule chose, l'URL du projet
> (`SUPABASE_URL`) — aucun secret à protéger de ce côté-là.

### Ce qu'il te reste à faire

**A. Récupérer l'URL du projet (backend ET frontend)**

1. Supabase → **Project Settings → API** (ou **Connect** en haut de l'écran)
2. Copie **Project URL** (ex. `https://xxxxx.supabase.co`) — c'est la seule
   information dont le backend a besoin pour l'authentification.

**B. Récupérer la clé publique du frontend**

1. Toujours sur **Project Settings → API**
2. Copie la clé **anon public** (onglet "Legacy anon, service_role API keys"
   si tu ne la vois pas directement — sinon la "Publishable key" fonctionne
   aussi) — cette clé est *faite* pour être publique, aucun souci à l'exposer
   côté navigateur.

**C. Configurer le backend déployé (Vercel)**

1. Projet backend → **Settings → Environment Variables**
2. Ajoute `SUPABASE_URL` = la valeur de l'étape A
3. Onglet **Deployments** → dernier déploiement → **⋯ → Redeploy**

**D. Configurer le frontend déployé (Vercel)**

1. Projet frontend → **Settings → Environment Variables**
2. Ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (étape B)
3. **Redeploy** (obligatoire : les variables `VITE_*` sont figées au moment du
   build, pas relues au démarrage)

**E. Créer les comptes des personnes/services autorisés**

Les comptes utilisent un identifiant simple (ex. `innovation`) plutôt qu'un
email réel. En interne, Supabase a quand même besoin d'un format email : le
frontend ajoute automatiquement `@datalian.local` avant d'envoyer la demande
de connexion (voir `EMAIL_DOMAIN` dans `frontend/src/pages/Login.jsx`).

1. Supabase → **Authentication → Users** → **Add user**
2. Dans le champ email, saisis `<identifiant>@datalian.local` — par exemple
   `innovation@datalian.local`
3. Coche **"Auto Confirm User"** (indispensable : sans ça, Supabase attend une
   confirmation par email, qui n'arrivera jamais sur un domaine bidon)
4. Renseigne un mot de passe, à communiquer toi-même à la personne/au service
5. Répète pour chaque compte à créer

Sur l'écran de connexion du site, il suffit ensuite de taper `innovation`
(sans `@datalian.local`) + le mot de passe.

> Un compte de ce type est partagé par tous ceux qui l'utilisent — on perd la
> traçabilité "qui a fait quoi" par personne. Si tu veux garder un accès
> nominatif pour certaines personnes, tu peux tout à fait mélanger les deux
> approches (comptes par service **et** comptes par personne).

**F. Développement local**

1. Backend : copie `backend/.env.example` en `backend/.env`, renseigne
   `SUPABASE_URL`
2. Frontend : copie `frontend/.env.example` en `frontend/.env.local`, renseigne
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Relance normalement (`uvicorn` / `npm run dev`) — l'écran de connexion
   apparaît aussi en local désormais, avec les mêmes comptes que sur le site
   déployé (même projet Supabase).

**G. Vérifier**

1. Ouvre le frontend déployé → l'écran de connexion doit s'afficher
2. Connecte-toi avec un des comptes créés à l'étape E
3. Le dashboard doit s'afficher normalement, et l'email connecté doit
   apparaître en bas de la barre latérale avec un bouton "Déconnexion"

---

## Étape 6 : récupération automatique du dataset de la veille (cron)

Plutôt que d'uploader chaque `.xlsx` à la main, le backend va chaque jour
récupérer lui-même le dataset de la veille auprès de l'API DecisionBrain
(`dat.atalian-dat-prod.decisionbrain.cloud`), exactement comme le faisait
`Script Python API DATALIAN.py`, mais automatiquement.

### Comment ça marche

- Vercel propose des **Cron Jobs** : une URL de ton API, appelée automatiquement
  à une heure fixe, tous les jours. Pas besoin de laisser un programme tourner
  en continu (impossible de toute façon sur des fonctions serverless).
- Une nouvelle route `GET /api/cron/import-daily` calcule la date d'hier,
  appelle l'API DecisionBrain, dézippe la réponse, et importe chaque `.xlsx`
  trouvé avec exactement la même logique que l'upload manuel (même règle : un
  dataset qui existe déjà pour cette date est remplacé).
- Cette route est protégée par un secret dédié (`CRON_SECRET`), différent du
  compte Supabase — ce n'est pas un utilisateur qui l'appelle, c'est Vercel.
  Personne d'autre ne peut la déclencher sans connaître ce secret.

### Ce qui a été changé dans le code (fait)

- `backend/app/decisionbrain_client.py` (nouveau) : appelle l'API DecisionBrain
  et extrait les `.xlsx` du ZIP retourné (repris de ton script).
- `backend/app/routers/cron.py` (nouveau) : route `/api/cron/import-daily`,
  protégée par `CRON_SECRET`.
- `backend/app/routers/datasets.py` : la logique d'import (upsert agents,
  remplacement du dataset du jour, création des missions) a été extraite dans
  une fonction `import_parsed_dataset()`, réutilisée par l'upload manuel *et*
  par le cron — pour être sûr que les deux se comportent exactement pareil.
- `backend/app/main.py` : branche la nouvelle route cron (sans le jeton
  Supabase, avec son propre secret).
- `backend/vercel.json` : ajoute la config `crons`, planifiée à `0 6 * * *`
  (6h00 UTC = 8h heure de Paris en été/CEST — voir remarque plus bas pour
  l'hiver).
- `backend/requirements.txt` : ajout de `requests` (appel HTTP vers
  DecisionBrain).
- `backend/.env.example` : ajout de `DECISIONBRAIN_API_KEY` et `CRON_SECRET`.

**Testé en réel** (pas une simulation) : l'appel a récupéré le vrai dataset
d'hier (`2026-07-15_scenario_2bff.xlsx`, 168 missions) directement depuis
DecisionBrain et l'a importé en base — visible ensuite via `/api/datasets`
comme n'importe quel import manuel. La route refuse aussi correctement une
requête sans le bon secret (401).

> ⚠️ **Remarque sur l'heure** : Vercel Cron fonctionne uniquement en UTC, sans
> notion de fuseau horaire. `0 6 * * *` correspond à 8h à Paris en été
> (CEST, UTC+2) mais à 7h en hiver (CET, UTC+1) — un décalage d'une heure
> selon la saison, sans conséquence pratique ici (on importe "hier", pas une
> heure précise dans la journée).

### Ce qu'il te reste à faire

**A. Récupérer la clé DecisionBrain**

Elle est dans `Script Python API DATALIAN.py`, variable `API_KEY` (déjà
exclue de Git, voir plus haut).

**B. Configurer le backend déployé (Vercel)**

1. Projet backend → **Settings → Environment Variables**
2. Ajoute `DECISIONBRAIN_API_KEY` = la clé de l'étape A
3. Ajoute `CRON_SECRET` = une valeur aléatoire de ton choix (par exemple générée
   avec `python -c "import secrets; print(secrets.token_hex(32))"`) — la même
   que celle mise en local à l'étape C ci-dessous
4. Onglet **Deployments** → dernier déploiement → **⋯ → Redeploy**
   (le fichier `vercel.json` doit être redéployé pour que Vercel enregistre le
   nouveau cron — vérifiable ensuite dans l'onglet **Cron Jobs** du projet)

**C. Développement local**

1. Backend : dans `backend/.env`, ajoute `DECISIONBRAIN_API_KEY` et
   `CRON_SECRET` (mêmes valeurs qu'en B)
2. Pour tester manuellement sans attendre 6h du matin :
   ```powershell
   curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:8000/api/cron/import-daily
   ```

**D. Vérifier en production**

1. Sur Vercel, projet backend → onglet **Cron Jobs** → le job
   `/api/cron/import-daily` doit apparaître, planifié tous les jours à 6h00 UTC
2. Le lendemain, vérifie dans **Deployments → Functions → Logs** (ou l'onglet
   Cron Jobs, qui garde un historique des exécutions) qu'il s'est bien exécuté,
   et regarde dans l'app que le dataset de la veille est apparu tout seul dans
   "Datasets"

---

## Ce qui ne change pas

- **Développement local** (`.\.venv\Scripts\Activate.ps1` + `uvicorn` + `npm run dev`)
  fonctionne comme avant, avec SQLite pour les données. Seule différence depuis
  l'étape 5 : il faut aussi configurer les clés Supabase en local (voir
  étape 5.F) pour passer l'écran de connexion — c'est voulu, l'app protège
  désormais des données de salariés partout, y compris en local.
- **Docker Compose** (`docker-compose up`) fonctionne aussi comme avant, avec
  les mêmes variables d'environnement à fournir pour l'authentification.

Les changements de code sont additifs (variables d'environnement, nouveaux
fichiers) — rien d'existant n'a été supprimé ou cassé.

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
- **Vercel Cron (Hobby)** : les cron jobs sont limités à une exécution par jour
  sur le plan gratuit — parfaitement suffisant pour notre besoin (une fois par
  jour), mais tu ne pourrais pas passer à toutes les heures sans upgrader.

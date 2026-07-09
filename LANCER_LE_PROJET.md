# Comment lancer le projet Datalian

## D'abord : comprendre la structure du projet

Ce projet est découpé en **deux parties distinctes** qui tournent séparément :

```
datalian_web/
├── frontend/   → ce que l'utilisateur voit dans le navigateur (React + Vite)
├── backend/    → le serveur qui gère les données (Python + FastAPI)
└── docker-compose.yml
```

Ces deux parties **ne parlent pas le même langage** :

| | Frontend | Backend |
|---|---|---|
| Langage | JavaScript / React | Python / FastAPI |
| Gestionnaire de paquets | `npm` | `pip` |
| Commande pour démarrer | `npm run dev` | `uvicorn ...` |
| Port | 5173 | 8000 |

---

## Pourquoi `npm run dev` ne fonctionne pas pour le backend ?

`npm` est l'outil de Node.js, donc il ne sert qu'à lancer du **JavaScript**. Le backend est écrit en **Python**, donc npm n'en sait rien. C'est comme essayer de lire un livre en anglais avec un dictionnaire espagnol.

- `npm run dev` → lance le **frontend** (React)
- `uvicorn app.main:app` → lance le **backend** (Python/FastAPI)

---

## Les différentes façons de lancer le backend

### 1. Le venv (environnement virtuel Python) — le plus simple en local

**C'est quoi un venv ?**
Par défaut, quand tu installes une librairie Python (`pip install truc`), elle s'installe pour tout ton ordinateur. Le problème : si deux projets ont besoin de versions différentes de la même librairie, ça crée des conflits.

Un **venv** (virtual environment) est un dossier isolé qui contient une version de Python et des librairies **propres à un seul projet**. Chaque projet a sa bulle.

```
.venv/          ← le dossier d'isolation (déjà créé ici à la racine)
  Scripts/      ← commandes pour activer le venv
  Lib/          ← les librairies installées dedans
```

**Comment l'utiliser :**

```powershell
# 1. Activer le venv (à faire à chaque nouvelle session de terminal)
.\.venv\Scripts\Activate.ps1
# Ton terminal affiche maintenant (.venv) au début → tu es dans la bulle

# 2. Aller dans le dossier backend
cd datalian_web\backend

# 3. Lancer le serveur
uvicorn app.main:app --reload --port 8000
```

- `--reload` : le serveur redémarre automatiquement quand tu modifies un fichier Python (pratique en développement)
- `--port 8000` : le serveur écoute sur le port 8000

> **Si les librairies ne sont pas encore installées dans le venv :**
> ```powershell
> pip install -r datalian_web\backend\requirements.txt
> ```
> `requirements.txt` = la liste de toutes les librairies dont le projet a besoin.

---

### 2. Docker — le plus propre, tourne partout

**C'est quoi Docker ?**
Imagine que tu veux envoyer ton projet à un collègue, mais ça ne marche pas chez lui parce qu'il a une version différente de Python, un OS différent, etc.

Docker **empaquette tout** : le code, Python, les librairies, la configuration système dans une "image". Cette image tourne dans un "conteneur" — une mini-machine virtuelle ultra-légère qui se comporte exactement pareil partout.

**Comment l'utiliser :**

```powershell
# Depuis le dossier datalian_web
cd datalian_web

# Lancer uniquement le backend
docker-compose up backend

# Lancer backend + frontend en même temps
docker-compose up

# Arrêter tout
docker-compose down
```

**Avantage :** pas besoin d'installer Python, pip, ou quoi que ce soit sur ta machine. Docker gère tout.

**Inconvénient :** il faut avoir Docker Desktop installé.

---

### 3. Comparaison rapide

| | venv | Docker |
|---|---|---|
| Installation | Python suffit | Docker Desktop requis |
| Vitesse de démarrage | Rapide | Plus lent (build de l'image) |
| Isolation | Librairies Python seulement | Tout le système |
| Utilisation typique | Développement en solo | Équipe, prod, partage |
| Commande | `uvicorn app.main:app --reload` | `docker-compose up` |

---

## Résumé pour ce projet

### Lancer le backend seul (développement rapide)

```powershell
# Depuis la racine du projet
.\.venv\Scripts\Activate.ps1
cd datalian_web\backend
uvicorn app.main:app --reload --port 8000
```

### Lancer le frontend seul

```powershell
cd datalian_web\frontend
npm run dev
```

### Lancer les deux avec Docker

```powershell
cd datalian_web
docker-compose up
```

---

## Vérifier que ça marche

| Ce que tu ouvres dans le navigateur | Ce que tu vois |
|---|---|
| http://localhost:8000 | `{"status": "ok"}` → le backend tourne |
| http://localhost:8000/docs | La documentation auto de l'API (très utile !) |
| http://localhost:5173 | L'interface React → le frontend tourne |

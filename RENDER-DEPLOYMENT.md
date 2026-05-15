# Render Deployment Guide

This repository is ready for deployment to Render. The backend is configured to use PostgreSQL via `DATABASE_URL`, and the frontend is built as a PWA.

## GitHub Repository
Your repo is already pushed to GitHub:

- https://github.com/jared310/AgriLink

## What is already in place
- `backend/main.py` now supports PostgreSQL via `DATABASE_URL`
- `backend/requirements.txt` includes `SQLAlchemy` and `psycopg2-binary`
- `backend/.env.example` now documents `DATABASE_URL`
- `frontend` includes PWA assets: `manifest.json` and `sw.js`
- GitHub Actions workflows exist:
  - `.github/workflows/build-pwa.yml`
  - `.github/workflows/deploy-to-render.yml`

## Render setup steps

### 1) Create a Render account
Go to https://render.com and sign up or log in.

### 2) Connect your GitHub repo
Connect the `jared310/AgriLink` repository to Render.

### 3) Create a PostgreSQL database service
1. In Render, choose **New** → **PostgreSQL**.
2. Name it `agrilink-db` or similar.
3. Choose the free plan.
4. When ready, copy the `DATABASE_URL` from the Render dashboard.

### 4) Create a web service for the backend
There are two options:

#### Option A — Use `render.yaml` (recommended)
1. In Render, choose **New** → **Import from GitHub**.
2. Select the `jared310/AgriLink` repository.
3. Render will detect `render.yaml` and create services automatically:
   - `agrilink-db` (PostgreSQL)
   - `agrilink-backend` (Python web service)
4. Confirm the service names and create them.

#### Option B — Create manually
1. In Render, choose **New** → **Web Service**.
2. Select the `AgriLink` repository.
3. Set the root directory to `backend`.
4. Use these values:
   - **Environment**: `Python 3`
   - **Build command**:
     ```bash
     pip install -r requirements.txt && cd ../frontend && npm ci && npm run build:pwa
     ```
   - **Start command**:
     ```bash
     gunicorn --bind :$PORT main:app
     ```
5. Set environment variables:
   - `DATABASE_URL` → the value from the PostgreSQL service
   - `FLASK_ENV` → `production`
   - `DEBUG` → `False`

### 5) Add Render deploy secrets to GitHub
In GitHub repo settings, go to **Secrets and variables** → **Actions** and add:
- `RENDER_API_KEY` (from Render Account → API Keys)
- `RENDER_SERVICE_ID` (your backend service ID from Render)

These allow `.github/workflows/deploy-to-render.yml` to trigger a deploy when you push to `main`.

## How to deploy
1. Push a commit to `main`.
2. GitHub Actions will run `build-pwa.yml` and `deploy-to-render.yml`.
3. The Render service should build the backend and frontend and then deploy.

## Expected public URL
Render will assign a URL like:

- `https://your-service-name.onrender.com`

Once the service is live, open that URL on your phone.

## If you want me to finish the Render setup for you
I still need one of these from you:
- `RENDER_API_KEY` and `RENDER_SERVICE_ID` (as GitHub secrets), or
- Render account access so I can create the services directly.

If you provide the GitHub repo and Render secrets, I can complete the deployment from here.

# Deployment Guide - Budget + Task Planner

This guide shows a local-first workflow with deployments to:
- Frontend: Vercel (free)
- Backend: Render (free)
- Database + Auth: Supabase (free)

You can keep working locally, test changes, and deploy only when ready.

---

## 0) Local-first workflow

1) Make changes locally.
2) Test locally (backend + frontend).
3) Commit to Git.
4) Push to GitHub/GitLab.
5) Vercel + Render auto-deploy from your repo.

Recommended branches:
- `dev` for testing
- `main` for production

---

## 1) Supabase: Create project + database

1) Go to https://supabase.com and create a new project.
2) Open **Project ? Settings ? Database ? Connect**.
3) Copy the **Direct connection string** (useful for Render).

Example connection string:
```
postgresql://postgres:YOUR_PASSWORD@db.<project>.supabase.co:5432/postgres
```

Optional: enable Supabase Auth in **Auth ? Providers** if you plan to migrate auth later.

---

## 2) Backend: Prepare for Postgres

### 2.1 Install Postgres driver (local)
```
cd "d:\Project\Budget and Task\backend"
py -m pip install psycopg[binary]
```

### 2.2 Run migrations against Supabase
```
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.<project>.supabase.co:5432/postgres"
py -m alembic upgrade head
```

### 2.3 Backend env vars (Render)
You will add these in Render later:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.<project>.supabase.co:5432/postgres
JWT_SECRET=change-me
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
```

---

## 3) Deploy backend to Render (free)

1) Push your repo to GitHub/GitLab.
2) In Render: New ? **Web Service**.
3) Connect your repo.
4) Settings:
   - **Root Dir:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5) Add env vars:
   - `DATABASE_URL` (Supabase connection)
   - `JWT_SECRET`
   - `FRONTEND_ORIGIN` (Vercel URL)
6) Deploy.

Notes:
- Render free services sleep after 15 minutes of inactivity.
- Render free disk is ephemeral; never use SQLite in production.

---

## 4) Deploy frontend to Vercel (free)

1) In Vercel: New Project ? import repo.
2) Set **Root Directory** to `frontend`.
3) Build settings (Vite default):
   - Build Command: `npm run build`
   - Output Directory: `dist`
4) Add env var:
   - `VITE_API_URL=https://your-render-api.onrender.com`
5) Deploy.

---

## 5) Keep local + remote in sync

Local testing (SQLite) is fine. For production (Render), use Supabase.

Local run:
```
cd "d:\Project\Budget and Task\backend"
$env:DATABASE_URL="sqlite:///C:/Users/dhire/AppData/Local/Temp/budget_test.db"
py -m alembic upgrade head
py -m uvicorn app.main:app --port 8011

cd "d:\Project\Budget and Task\frontend"
Set-Content -Path ".env.local" -Value "VITE_API_URL=http://localhost:8011"
npm run dev
```

Deploy steps:
1) Commit
2) Push
3) Render deploys backend
4) Vercel deploys frontend

---

## 6) Optional: move to Supabase Auth

Right now the app uses local username/password + JWT.
If you want Supabase Auth, code changes are required:
- Frontend uses Supabase JS client for sign-in
- Backend validates Supabase JWTs

Tell me when you want this migration and I will implement it.

---

## 7) Checklist (Quick)

[ ] Supabase project created
[ ] Postgres connection string saved
[ ] Alembic migrations run against Supabase
[ ] Render service created + env vars set
[ ] Vercel project created + VITE_API_URL set
[ ] Deploy complete

---

## Support

If anything fails, paste the error and I will fix it.

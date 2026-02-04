# Budget + Task Planner (Local)

Deterministic, rule-based budget and task planner. No AI/LLM calls. Run locally with React + FastAPI + SQLite.

## Features
- Username/password auth with bcrypt + JWT (httpOnly cookie preferred; localStorage optional)
- Budget setup wizard (salary, categories, debts, summary)
- Editable categories with automatic recalculation
- Expense tracking + real-time alerts (80% and 100% thresholds)
- Debt payoff simulator (avalanche or snowball)
- Task planning (priorities, due dates, statuses, alerts)

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: FastAPI + SQLAlchemy + Alembic
- DB: SQLite (local)

## Local Development

### 1) Backend
```bash
cd "backend"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Create DB and run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload --port 8000
```

Create `.env` in `backend` if needed:
```
DATABASE_URL=sqlite:///./budget.db
JWT_SECRET=dev-change-me
FRONTEND_ORIGIN=http://localhost:5173
```

### Optional: SMS + Email alerts
The app can send task alerts via SMS (Twilio) or Email (SendGrid). If not configured, alerts stay in-app only.

Add to `backend/.env`:
```
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
```

Disable the scheduler (if you do not want background jobs):
```
DISABLE_TASK_SCHEDULER=true
```

### 2) Frontend
```bash
cd "frontend"
npm install
npm run dev
```

Open: `http://localhost:5173`

Optional environment variable:
```
VITE_API_URL=http://localhost:8000
```

## Security Notes
- Auth tokens are set as httpOnly cookies by the API.
- If you enable “Remember me” on the login screen, a copy of the token is stored in `localStorage` (less secure). This is optional and can be disabled.

## Future Publish (Postgres + Hosting)

### 1) Switch to Postgres
- Update `DATABASE_URL` to a Postgres URL:
  `postgresql+psycopg://user:password@host:port/dbname`
- Install Postgres driver:
  `pip install psycopg[binary]`
- Run migrations:
  `alembic upgrade head`

### 2) Hosting Options

**Render / Railway / Fly.io (API)**
1. Create a new service from the `backend` directory.
2. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`.
3. Run migration on deploy (build step or release command): `alembic upgrade head`.
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

**Vercel / Netlify (Frontend)**
1. Deploy the `frontend` directory.
2. Set `VITE_API_URL` to your API URL.
3. Build command: `npm run build`.

### Production Cookie Settings
- Set `secure=True` and `samesite="None"` if using cross-site cookies.
- Use HTTPS for both frontend and backend.

## Notes
- Category deletions require moving expenses to a replacement category or to “Uncategorized”.
- Budget summaries recalculate whenever categories or expenses change.

Admin login:
- Set ADMIN_USERNAME and ADMIN_PASSWORD in backend env (Render) to choose admin credentials.
- Admin is created automatically on backend startup if no admin exists.

Suggestions:
- Users can submit suggestions from Suggestions tab.
- Admin can view all suggestions in Admin tab.

Impersonation:
- Admin can click "Open" on a user to switch into that account.
- This uses a new access token issued by /admin/impersonate.

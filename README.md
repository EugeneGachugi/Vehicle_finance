# Vehicle Finance

Vehicle Finance is a full-stack vehicle financing app for managing drivers, vehicles,
documents, financing contracts, invoices, and payments.

The backend is a Django REST API. The frontend is a Vite + React dashboard.

## Repository Layout

```text
.
├── vehicle_finance/          # Django backend
│   ├── apps/                 # Domain apps: users, vehicles, payments, documents
│   ├── vehicle_finance/      # Django project settings and URLs
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
└── front_end/front_end/      # React frontend
    ├── src/
    ├── package.json
    └── .env.example
```

## What Is Committed

The `.gitignore` file is intentionally committed. GitHub shows it because the file
tells Git which local files should stay off GitHub, such as `.env`, `db.sqlite3`,
`.venv`, `node_modules`, build folders, archives, and cache files.

## Backend Setup

```bash
cd vehicle_finance
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

For local SQLite development, set this in `vehicle_finance/.env`:

```env
DATABASE_URL=sqlite:///db.sqlite3
```

The API will run at `http://127.0.0.1:8000`.

## Frontend Setup

```bash
cd front_end/front_end
npm install
cp .env.example .env
npm run dev
```

The frontend will run at the Vite URL printed in the terminal, usually
`http://127.0.0.1:5173`.

## Useful Commands

```bash
# Check what would be committed
git status

# See ignored local files
git status --ignored --short

# Backend checks
cd vehicle_finance
python manage.py check

# Frontend build
cd front_end/front_end
npm run build
```

## Notes

- Do not commit real `.env` files. Use `.env.example` for safe placeholder values.
- Do not commit local databases, virtual environments, `node_modules`, or build output.
- The current Git remote is `origin`, pointing at the GitHub repository for this app.

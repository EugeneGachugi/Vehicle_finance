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

## Documents MVP

Admins can upload driver and vehicle documents from the Documents panel in the
admin console, then verify or reject each pending document. Driver documents are
attached to `DriverProfile`; vehicle documents are attached to `Vehicle`.

Run the expiry check manually with:

```bash
cd vehicle_finance
python manage.py check_document_expiry
```

The command marks verified or pending documents past their expiry date as
expired. It also sends warnings for verified documents expiring within seven
days. Local development uses Django's console email backend by default, so
warning emails appear in the Django terminal.

To test the workflow:

1. Sign in as a staff/admin user and open **Documents**.
2. Choose Driver or Vehicle, select the target and document type, then upload a file.
3. Open the uploaded file from the documents table and select Verify or Reject.
4. Run `python manage.py check_document_expiry` to test expiry processing.

## Notes

- Do not commit real `.env` files. Use `.env.example` for safe placeholder values.
- Do not commit local databases, virtual environments, `node_modules`, or build output.
- The current Git remote is `origin`, pointing at the GitHub repository for this app.

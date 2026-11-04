# Sweety – Blood Glucose Tracker

Sweety is a friendly, full-stack blood glucose journal for recording up to four readings per day and understanding daily and monthly trends.

## Features

- Secure sign up and login with bcrypt password hashing and JWT sessions.
- Private CRUD readings for four slots: Morning (fasting), After breakfast, After lunch, and After dinner.
- Clear validation for required values, whole-number range (40–600 mg/dl), duplicate slots, four-reading daily limit, and future dates.
- Daily, month-to-date, and previous-month reports with min, max, average, count, and a daily reading list.
- Responsive dashboard with trend chart, quick stats, empty states, and inline feedback.
- Seed script with a demo account and sample data.

## Requirements

- Node.js 18+
- PostgreSQL 14+

## Install

```bash
copy .env.example server\.env
npm install
npm run install:all
```

Create the database, then initialize the schema:

```bash
createdb sweety
npm run db:init --prefix server
```

For Supabase, open your project and choose **Connect → Database → URI**. Copy the URI into `DATABASE_URL`; use the session pooler URI if direct database connections are unavailable. URL-encode special characters in the database password. Add a strong `JWT_SECRET`.

The API uses PostgreSQL through `pg`; `NEXT_PUBLIC_SUPABASE_URL` and a Supabase publishable key are not used by this backend.

## Run

Start API and client together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

The client runs at http://localhost:5173 and the API at http://localhost:5000.

## Demo data

```bash
npm run seed --prefix server
```

Demo credentials: `demo@sweety.app` / `Sweety123!`

## Tests

```bash
npm test
```

The API tests cover the validation rules and report calculations without requiring a database.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/readings?date=YYYY-MM-DD`
- `POST /api/readings`
- `PUT /api/readings/:id`
- `DELETE /api/readings/:id`
- `GET /api/reports/daily?date=YYYY-MM-DD`
- `GET /api/reports/month-to-date?date=YYYY-MM-DD`
- `GET /api/reports/monthly?date=YYYY-MM-DD`

## Notes

- Dates are stored as calendar dates and interpreted in the user's local browser timezone. The API accepts `YYYY-MM-DD`; this avoids accidental date shifts around midnight.
- A reading's time is kept as a slot rather than a clock time because the product requirements define four clinically meaningful slots.
- With more time, I would add clinician sharing with explicit consent, medication/context notes, accessibility testing with screen readers, and deployment automation.

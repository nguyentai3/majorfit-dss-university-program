# MajorFit

A web-based Decision Support System for personalized university program recommendation in Vietnamese higher education. International University, VNU HCMC, 2026.

## Tech Stack

- Node.js (v18 or higher)
- Express.js 4
- Prisma ORM
- MySQL 8
- React 18 + Vite
- Ant Design + Tailwind CSS
- React Query
- i18next (English + Vietnamese)
- OpenAI-compatible AI provider (Groq, OpenAI, Gemini)

## Prerequisites

- Node.js v18 or higher
- MySQL 8 (MAMP on port 8889, or standalone MySQL on port 3306)
- npm
- (Optional) Groq API key for AI features — https://console.groq.com

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/nguyentai3/majorfit-dss-university-program.git
cd majorfit-dss
```

### 2. Database Setup

You have two options:

**Option A — Quick setup with seed scripts (recommended)**

Make sure MySQL is running, then:

```bash
npm run setup
```

This will install dependencies, create `.env` files, provision the database, push the schema, and seed all required data (48 RIASEC questions, 923 O*NET occupations, 186 Vietnamese university programs).

**Option B — Import the demo database from Google Drive**

Download the SQL file from Google Drive: https://drive.google.com/file/d/1ha07pmrRtcxfpRhQR32qaFXQGNmG1B_b/view?usp=sharing

Then create the database and import:

```bash
# MAMP MySQL (port 8889)
mysql -u root -proot -h 127.0.0.1 -P 8889 -e "CREATE DATABASE majorfit"
mysql -u root -proot -h 127.0.0.1 -P 8889 majorfit < ~/Downloads/majorfit_demo.sql

# Standard MySQL (port 3306)
mysql -u root -p -e "CREATE DATABASE majorfit"
mysql -u root -p majorfit < ~/Downloads/majorfit_demo.sql
```

Then install dependencies:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Configure Environment

Edit `backend/.env` if your MySQL credentials differ from the defaults:

```env
PORT=8000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAILS=admin@majorfit.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123456
DEFAULT_USER_EMAIL=test@gmail.com
DEFAULT_USER_PASSWORD=123456

DB_HOST=127.0.0.1
DB_PORT=8889
DB_USER=root
DB_PASS=root
DB_NAME=majorfit

AI_PROVIDER=groq
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=
AI_TEMPERATURE=0.2
```

`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_PROXY_TARGET=http://localhost:8000
VITE_ADMIN_EMAILS=admin@majorfit.local
```

### 4. Run the Application

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## AI Configuration (Optional)

The matching engine works fully without AI. AI is used only for admin curriculum analysis and student match explanations.

To enable AI features:

1. Go to https://console.groq.com and sign up (free)
2. Create an API key
3. Update `backend/.env`:
   ```env
   AI_API_KEY=gsk_your_actual_key_here
   ```
4. Restart the dev server

If `AI_API_KEY` is empty, the system runs in manual mode and AI features are disabled gracefully.

## Default Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@majorfit.local` | `123456` |
| User | `test@gmail.com` | `123456` |

If you imported the demo database from Google Drive (Option B), all existing accounts also use the password `123456`.

You can also register a new user account at http://localhost:5173/auth/signup.

## Available Scripts

- `npm run setup` — One-shot setup (install, provision DB, push schema, seed data)
- `npm run setup:fresh` — Drop database and re-run setup
- `npm run dev` — Start backend and frontend together
- `npm run build` — Production build
- `npm run db:provision` — Create the `majorfit` database
- `npm run db:push` — Push Prisma schema to MySQL
- `npm run db:seed-riasec` — Seed RIASEC questions
- `npm run db:seed-onet` — Seed O*NET occupations
- `npm run db:seed-programs` — Seed Vietnamese university programs
- `npm run db:sync-admin` — Sync admin account from `.env`
- `npm run db:studio` — Open Prisma Studio
- `npm run test` — Run unit tests

## API Endpoints

- Authentication: `/api/auth/*`
- Profile: `/api/profile/*`
- RIASEC: `/api/riasec/*`
- Programs: `/api/programs/*`
- Matching: `/api/matching/*`
- Admin: `/api/admin/*`

## Important Notes

- Make sure MySQL is running before starting the server
- Backend runs on port 8000, frontend on 5173
- Default Prisma connection assumes user `root` and password `root`
- AI features are optional — the matching engine itself is fully deterministic
- Keep your API keys secure; do not commit `.env` files

## Author

**Nguyen Tan Tai**
- Student ID (UWE): `25066008`
- Student ID (IU): `ITITWE19023`

International University, Vietnam National University Ho Chi Minh City
2026

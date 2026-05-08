# MajorFit

MajorFit is a thesis project implementing a 3-step student-program matching system:

1. **RIASEC Assessment** - Students take a Holland-based assessment to generate a capability profile (RIASEC scores, skill vectors, confidence).
2. **AI Curriculum Analysis** - Admins upload university curricula; AI analyzes them to produce measurable program profiles (RIASEC scores, skill maps).
3. **Profile Matching** - The system matches student profiles against program profiles using a weighted multi-factor scoring formula.

## Tech Stack

- **Frontend**: React 18 + Vite + Ant Design + Tailwind CSS
- **Backend**: Express 4 + Prisma + MySQL (MAMP)
- **Database**: majorfit
- **Auth**: JWT + HttpOnly cookies (separate user/admin flows)
- **AI**: OpenAI-compatible / Groq providers (default: manual-ai mode)

## Architecture

### Public user flow
- Public site: /, /auth/signin, /dashboard, /assessment, /programs, /matching
- Auth against the `users` table, cookie: `auth_token`

### Admin flow
- Admin routes: /admin/signin, /admin
- Auth against the `admin` table, cookie: `admin_auth_token`

## Local Development

### 1. Database
Local MySQL (MAMP):
- host: 127.0.0.1, port: 8889
- user: root, password: root
- database: majorfit

### 2. Environment
Copy .env.example files and adjust:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key env values:
- `DATABASE_URL=mysql://root:root@127.0.0.1:8889/majorfit`
- `JWT_SECRET` (change from default)
- `ADMIN_EMAILS=admin@majorfit.local`

### 3. Install

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 4. Prepare database

```bash
npm run db:provision -- --db majorfit
npm run db:push
npm run db:sync-admin
```

### 5. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend + backend |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:sync-admin` | Sync admin accounts |
| `npm run db:studio` | Open Prisma Studio |

## Database Notes

- Public users: `users` table
- Admin accounts: `admin` table
- Assessment data: `RiasecQuestion`, `RiasecAttempt`, `RiasecAnswer`, `UserRiasecProfile`
- Program data: `University`, `Program`, `ProgramCurriculum`, `ProgramProfile`, `ProgramAnalysisRun`
- Matching data: `MatchingRun`, `MatchResult`

See `backend/db/DATABASE_DESIGN.md` for the full schema.

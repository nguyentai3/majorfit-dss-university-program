# MajorFit Database Design

This document describes the active MySQL schema for the MajorFit thesis platform.

## 1. Core Scope

The product is organized around three thesis modules:

- **Step 1**: Repeated student capability assessment (RIASEC)
- **Step 2**: AI-assisted curriculum and program analysis
- **Step 3**: Deterministic program matching with AI explanation

The stack is:

- MySQL (MAMP)
- Prisma ORM with `db push` schema management
- Cookie-based JWT authentication
- Separate public user and admin authentication flows

## 2. Authentication

### Public users
- Table: `users`
- Routes: `POST /api/auth/signin`, `POST /api/auth/signup`, `GET /api/auth/session`
- Cookie: `auth_token`

### Admin accounts
- Table: `admins`
- Routes: `POST /api/auth/admin/signin`, `POST /api/auth/admin/signout`, `GET /api/auth/admin/session`
- Cookie: `admin_auth_token`

## 3. Tables by Domain

### Authentication (Section 1)
| Table | Purpose |
|-------|---------|
| `admins` | Admin r accounts |
| `users` | Student / publoperatoic user accounts |

### Student Profile (Section 2)
| Table | Purpose |
|-------|---------|
| `profiles` | Extended academic profile (1-to-1 with users via shared PK) |

### RIASEC Assessment — Step 1 (Section 3)
| Table | Purpose |
|-------|---------|
| `assessment_campaigns` | Campaign periods (semester, class, school) |
| `riasec_questions` | Question bank (versioned, activatable) |
| `riasec_attempts` | Individual assessment submissions |
| `riasec_answers` | Per-question answers within an attempt |
| `user_riasec_profiles` | Aggregated RIASEC profile per student |

### Program Catalog — Step 2 (Section 4)
| Table | Purpose |
|-------|---------|
| `universities` | University master list |
| `programs` | Degree programs |
| `program_curriculums` | Uploaded/extracted curriculum documents |
| `program_profiles` | AI-analyzed RIASEC + skill profile per program |
| `program_analysis_runs` | AI prompt/response history for review |

### Matching — Step 3 (Section 5)
| Table | Purpose |
|-------|---------|
| `matching_runs` | One matching session per student |
| `match_results` | Per-program score within a matching run |

### User Actions (Section 6)
| Table | Purpose |
|-------|---------|
| `saved_programs` | Programs bookmarked by students |

## 4. Key Relationships

```
users 1─1 profiles          (profiles.id = users.id)
users 1─N riasec_attempts
users 1─1 user_riasec_profiles
users 1─N saved_programs
users 1─N matching_runs

assessment_campaigns 1─N riasec_attempts
riasec_attempts      1─N riasec_answers

universities 1─N programs
programs     1─N program_curriculums
programs     1─N program_profiles
programs     1─N program_analysis_runs

matching_runs 1─N match_results
```

## 5. Column Naming Convention

All MySQL columns use `snake_case` via Prisma `@map()`. Example mappings:

| Prisma field | MySQL column |
|--------------|--------------|
| `firstName` | `first_name` |
| `avatarUrl` | `avatar_url` |
| `createdAt` | `created_at` |
| `userId` | `user_id` |

## 6. Operational Notes

- `ProgramProfile` is the published representation of a program used by Step 3.
- `UserRiasecProfile` stores the current student capability summary used by Step 3.
- `ProgramAnalysisRun` stores AI prompt/output history and supports manual review before publish.
- Matching is deterministic at the scoring core; AI is used only for explanation and comparison.
- `Profile.id` equals `User.id` — they share the same primary key for 1-to-1 linking.

## 7. Local Operations

From project root:

```bash
npm run db:generate
npm run db:push
npm run build
```

From backend:

```bash
npm run prisma:generate
npx prisma db push --schema db/prisma/schema.prisma
```

### Migration from old database

```bash
# 1. Create the current DB in MAMP phpMyAdmin
CREATE DATABASE majorfit;

# 2. Update .env
DATABASE_URL="mysql://root@127.0.0.1:3306/majorfit"

# 3. Push schema
npx prisma db push --schema db/prisma/schema.prisma

# 4. Copy data
mysql -u root < db/migrate-to-v2.sql

# 5. Seed (if fresh start)
npm run seed:riasec
npm run seed:programs
```

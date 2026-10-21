# DocIt

DocIt is a web application that helps student chapters manage their documentation: events, budgets, speakers, participant lists, approval-ready documents, certificates, and exports. It is built for chapters of professional bodies and student clubs (for example, IEEE SIGHT, CSI, and NSS chapters) and is first deployed for MJCET.

---

## Table of Contents

1. [Features](#features)
2. [Who It's For](#whos-for)
3. [Roles and Permissions](#roles-and-permissions)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Project Structure](#project-structure)
7. [Data Model](#data-model)
8. [Getting Started (Local Development)](#getting-started-local-development)
9. [Environment Variables](#environment-variables)
10. [Scripts](#scripts)
11. [Deployment (Vercel + Neon + Cloudflare R2)](#deployment-vercel--neon--cloudflare-r2)
12. [Email Notifications](#email-notifications)
13. [File Storage](#file-storage)
14. [Document Generation](#document-generation)
15. [CSV Import and Export](#csv-import-and-export)
16. [Security Notes](#security-notes)
17. [Status and Known Limitations](#status-and-known-limitations)
18. [Roadmap](#roadmap)
19. [Troubleshooting](#troubleshooting)
20. [Contributing](#contributing)
21. [License](#license)

---

## Features

### Chapters and Onboarding
- A new user can **create a chapter** (name and parent body, such as IEEE SIGHT, CSI, NSS, or Other). The creator becomes its **CHAIR**.
- A user can **join an existing chapter** from a list. New members start as **CONTRIBUTOR**.
- A user can belong to several chapters and switch between them. The active chapter is stored in an HTTP-only cookie.
- Each chapter has an academic year (for example, `2026-2027`), set automatically at creation.

### Events
- Create, view, edit, search, and archive events.
- Event types include workshops, seminars, competitions, and others (defined in `event-helpers.ts`).
- Each event stores title, type, start and end time (in IST), venue, objectives, outcomes, expected participant count, tags, speakers, and budget lines.
- Speakers have a name, designation, and short bio.
- Budget lines have an item, an amount in rupees (up to two decimal places), and notes. The total is calculated automatically.
- Editing an event replaces its speakers and budget lines with the submitted list.

### Search, Filters, and Archive
- Case-insensitive search across event title and venue (PostgreSQL `ILIKE` via Prisma `mode: "insensitive"`).
- Filter by status and type.
- Archived events are hidden from the default list but kept in the database.
- Only the CHAIR can archive an event.

### Documents and Approvals
- Generate Word (`.docx`) documents from templates for an event. Supported document types are defined in `DOCUMENT_TYPES`.
- Each generation creates a new **version** with status `PENDING`.
- Documents move through an approval flow. **Only the CHAIR approves**. Every approval step routes to the CHAIR.
- Generated files are stored in Cloudflare R2 (S3-compatible storage).
- The CHAIR receives an email when a document is waiting for approval.

### Certificates
- The certificate generator exists in the UI and is being built out. Templates and QR codes are still placeholders (see [Status and Known Limitations](#status-and-known-limitations)).
- Planned: send each participant their certificate by email.

### Participant Import and Export
- Import participants from a CSV file. The parser handles quoted names, Excel's UTF-8 BOM, trimmed whitespace, and mixed-case headers (`name`, `Name`, `NAME`, `email`, `Email`, `EMAIL`). Rows without a name or email are skipped.
- Export the chapter's event list as a CSV (title, type, date, venue, status, participants, and document count). Values are escaped for quotes and commas.

### Audit Trail
- Key actions (for example, document generation) are written to an audit log through `audit.service.ts`.

---

## Who It's For

| User | What they do in DocIt |
|---|---|
| **Chair** | Creates the chapter, manages members and roles, approves every document, archives events, and exports reports. |
| **Docs lead** | Creates and edits events, generates documents, and submits them for approval. |
| **Contributor** | Views events and uploads media. Typically a volunteer on a specific event. |
| **Viewer** | Read-only access to events. |

---

## Roles and Permissions

There are four roles. Permissions are defined in one matrix in `src/server/services/permissions.service.ts`.

| Action | CHAIR | DOCS | CONTRIBUTOR | VIEWER |
|---|:---:|:---:|:---:|:---:|
| View events | ✅ | ✅ | ✅ | ✅ |
| Create / update / archive events | ✅ | ✅ | ❌ | ❌ |
| Create and submit documents | ✅ | ✅ | ❌ | ❌ |
| Approve documents | ✅ | ❌ | ❌ | ❌ |
| Generate certificates | ✅ | ✅ | ❌ | ❌ |
| Upload media | ✅ | ❌ | ✅ | ❌ |
| Manage chapter and members | ✅ | ❌ | ❌ | ❌ |

**Rules:**
- The CHAIR is the admin and the only approver.
- The role `ADVISOR` was removed. The former `ADMIN` role is now `CHAIR`.
- Permission checks happen on the server (`requireMember`, `requireAction`). The UI hides controls, but the server enforces the rules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Authentication | Auth.js v5 (`next-auth@5` beta), Google OAuth, email magic link |
| Database | PostgreSQL (Neon in production), Prisma ORM 5 |
| File storage | Cloudflare R2 via the AWS S3 SDK |
| Documents | docxtemplater + PizZip (`.docx` templates) |
| Email | Nodemailer with Gmail SMTP (App Password) |
| CSV | csv-parse (import), manual escaping (export) |
| Validation | Zod |
| Dates | date-fns |
| Testing | Vitest, Testing Library, Playwright (placeholders, see Status) |
| Hosting | Vercel (functions in `bom1`, Mumbai) |

---

## Architecture

```
Browser
  │
  ▼
Next.js App Router (Vercel)
  ├── middleware.ts         Cookie check and redirects only (Edge-safe, no DB)
  ├── app/ (pages)          Server Components call services directly
  ├── server/actions/       Server Actions for forms (events, etc.)
  ├── app/api/              Route handlers (documents, exports, chapter switch)
  └── server/services/      Business logic: permissions, events, approvals,
                            documents, mail, CSV, audit
        │
        ├── Neon Postgres (Prisma)
        ├── Cloudflare R2 (documents, media)
        ├── Gmail SMTP (notifications)
        └── Google OAuth / email sign-in (Auth.js)
```

**Key design decisions:**
- **Middleware does not touch the database.** Prisma doesn't run on the Edge runtime, so middleware only checks that a session cookie exists. Pages and actions call `auth()` and the permission service to verify identity and role.
- **Money is stored as `Decimal(12,2)` in rupees.** Earlier versions used paise (integers). Use `Number(value)` when passing amounts to the UI or templates.
- **Datetimes are interpreted as IST.** Form values without a timezone are converted with `+05:30`.
- **Server Actions for forms, route handlers for file and export endpoints.**

---

## Project Structure

This is the intended layout. Some files are still stubs (see Status).

```
docit/
├── prisma/
│   ├── schema.prisma
│   └── migrations/              Includes roles_and_decimal_amounts
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── verify/
│   │   │   └── onboarding/page.tsx
│   │   ├── _lib/
│   │   │   ├── session.ts       requireActiveChapter, loadEventForUser
│   │   │   └── event-helpers.ts EVENT_TYPES, EVENT_STATUSES, DOCUMENT_TYPES
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── chapter/set-active/route.ts
│   │   │   └── events/
│   │   │       ├── export/route.ts
│   │   │       └── [eventId]/documents/route.ts
│   │   ├── dashboard/
│   │   ├── events/
│   │   │   ├── page.tsx         Search, filters, list
│   │   │   ├── new/
│   │   │   └── [eventId]/page.tsx
│   │   ├── settings/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── events/EventForm.tsx
│   │   ├── documents/DocumentGenerator.tsx
│   │   └── certificates/CertificateGenerator.tsx
│   ├── hooks/
│   ├── lib/
│   │   ├── auth.ts              Auth.js v5 configuration
│   │   ├── db.ts                Prisma client singleton
│   │   ├── utils.ts             formatCurrency, helpers
│   │   └── validation/schemas.ts
│   ├── server/
│   │   ├── actions/events.ts    createEventAction, updateEventAction, archiveEventAction
│   │   └── services/
│   │       ├── approval.service.ts
│   │       ├── audit.service.ts
│   │       ├── csv.service.ts
│   │       ├── document.service.ts
│   │       ├── events.service.ts
│   │       ├── mail.service.ts
│   │       └── permissions.service.ts
│   ├── assets/templates/        .docx templates (to be added)
│   └── types/index.ts
├── middleware.ts                (or src/middleware.ts)
├── next.config.mjs
├── vercel.json                  { "regions": ["bom1"] }
├── package.json
└── README.md
```

---

## Data Model

Main models (simplified):

| Model | Purpose | Key fields |
|---|---|---|
| `User` | A person who signs in | `id`, `email`, `name` |
| `Chapter` | A student chapter | `id`, `name`, `parentBody`, `academicYear` |
| `Membership` | User-to-chapter link with a role | `userId`, `chapterId`, `role` (`CHAIR`, `DOCS`, `CONTRIBUTOR`, `VIEWER`), `termEnd` |
| `Event` | An event held by a chapter | `title`, `type`, `status`, `startsAt`, `endsAt`, `venue`, `objectives`, `outcomes`, `participantCount`, `tags`, `chapterId` |
| `Speaker` | Speakers for an event | `name`, `designation`, `bio`, `eventId` |
| `BudgetLine` | Budget items for an event | `item`, `amount` (`Decimal(12,2)`, rupees), `notes`, `eventId` |
| `Document` | One document per type per event | `type`, `eventId`, `chapterId` (unique on `eventId` + `type`) |
| `DocumentVersion` | Each generated file | `storageKey`, `status` (`PENDING` and others), `generatedById`, `documentId` |
| `AuditLog` | Record of actions | `userId`, `action`, `entity`, `entityId` |

Run `npx prisma studio` to inspect data locally.

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 20 or later
- npm (or pnpm)
- A PostgreSQL database (local Docker container, or a free Neon project)
- A Google Cloud OAuth client (for Google sign-in)
- A Gmail account with an App Password (for email)
- A Cloudflare R2 bucket and API token (for file storage)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/docit.git
cd docit

# 2. Install dependencies (also runs prisma generate)
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in the values (see Environment Variables)

# 4. Apply database migrations
npx prisma migrate dev

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

**First run:**
1. Sign in with Google or your email.
2. On the onboarding page, create a chapter. You become its CHAIR.
3. Create an event from the Events page.

---

## Environment Variables

Create `.env` locally. Add the same variables to Vercel under Project Settings > Environment Variables.

```bash
# Database
DATABASE_URL=              # Pooled Postgres URL (Neon: the pooled connection string)
DIRECT_URL=                # Direct Postgres URL (used by migrations)

# Auth (Auth.js v5)
AUTH_SECRET=               # openssl rand -base64 32
AUTH_URL=http://localhost:3000        # https://<your-domain> in production
NEXTAUTH_URL=http://localhost:3000    # Same value as AUTH_URL
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Email (Gmail SMTP)
EMAIL_SERVER=smtp://your.gmail@gmail.com:<app-password>@smtp.gmail.com:587
EMAIL_FROM=DocIt <your.gmail@gmail.com>
GMAIL_USER=your.gmail@gmail.com          # Used by mail.service.ts
GMAIL_APP_PASSWORD=<16-character app password>

# File storage (Cloudflare R2, S3-compatible)
S3_BUCKET=
S3_REGION=auto
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

**Notes:**
- `AUTH_SECRET` must be set in production. Don't commit `.env`.
- Gmail requires an **App Password** when 2-Step Verification is on. Your normal Gmail password won't work. Create one at Google Account > Security > App passwords.
- `mail.service.ts` reads `GMAIL_USER` and `GMAIL_APP_PASSWORD`, and the SMTP URL in `EMAIL_SERVER` is used by Auth.js for magic-link emails. Keep both in sync.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build (`next build`) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:deploy` | Apply committed migrations (`prisma migrate deploy`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run Vitest (tests are placeholders for now) |
| `npm run test:e2e` | Run Playwright (not yet written) |
| `postinstall` | Runs `prisma generate` automatically after install |

Before a release, these must pass: `npx prisma migrate deploy`, `npx tsc --noEmit`, and `npm run build`.

---

## Deployment (Vercel + Neon + Cloudflare R2)

### 1. Database (Neon)
1. Create a Neon Postgres project. Choose the Asia Pacific (Mumbai) region if available.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Copy the direct connection string into `DIRECT_URL`.

### 2. Google OAuth
1. In Google Cloud Console, create an OAuth client (Web application).
2. Add the authorized redirect URI: `https://<your-domain>/api/auth/callback/google`.
3. Put the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

### 3. Cloudflare R2
1. Create a bucket.
2. Create an R2 API token with read and write access to that bucket.
3. Set `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com` and `S3_REGION=auto`.
4. Check Cloudflare's current R2 pricing page for free-tier limits before relying on them.

### 4. Gmail
1. Turn on 2-Step Verification for the Gmail account.
2. Create an App Password and store it in `GMAIL_APP_PASSWORD`.

### 5. Migrate the database
From your machine, pointing at Neon:

```bash
npm run db:deploy
```

### 6. Deploy to Vercel
1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add all environment variables.
4. Deploy. Vercel runs `npm run build`.
5. Check the build log for type errors.
6. `vercel.json` sets the function region to `bom1` (Mumbai), close to the database and users in India.

---

## Email Notifications

`mail.service.ts` uses Nodemailer with Gmail.

| Email | Trigger | Recipient |
|---|---|---|
| Magic-link sign-in | User requests sign-in by email | The user (via Auth.js) |
| Document waiting for approval | A document version is generated | The CHAIR |
| Decision notification | A document is approved or rejected | The document's submitter (planned) |
| Certificate | A certificate is generated | Each participant (planned) |

Gmail limits sending volume for personal accounts. For larger distribution lists, consider Google Workspace or a transactional email provider.

---

## File Storage

Files go to a Cloudflare R2 bucket using the AWS S3 SDK.

- **Object key format:** `docs/<eventId>/<type>_<timestamp>.docx`
- **Access:** Files are private by default. Serve them through an authenticated route, or use short-lived presigned URLs (`@aws-sdk/s3-request-presigner`).
- **CORS:** If you link to files directly from the browser, add your domain to the R2 bucket's CORS policy.

**Data residency:** R2 has no India region, so files are stored outside India. If India-only storage is required, switch the S3 settings to AWS S3 in Mumbai (`ap-south-1`). The code uses the standard S3 API, so only the environment variables change.

---

## Document Generation

1. The user clicks **Generate** for a document type on an event page.
2. `POST /api/events/[eventId]/documents` checks authentication, event access, and the document type.
3. `DocumentService.generate` loads the event, its chapter, speakers, and budget lines.
4. The service renders a `.docx` template with docxtemplater.
5. The file is uploaded to R2.
6. A `Document` record is created or reused, and a new `DocumentVersion` with status `PENDING` is saved.
7. The CHAIR gets an email notification.
8. An audit entry is written.

**Templates:**
- Place `.docx` templates in `src/assets/templates/`, one per document type.
- Use docxtemplater tags, for example `{title}`, `{date}`, `{chapter}`, and a loop over `{#budget}...{/budget}`.
- Amounts are passed as numbers. Format them in the template or in the service.

> **Current state:** `fetchTemplate` in `document.service.ts` is a placeholder that returns an empty buffer. Real template loading must be added before documents can be generated.

---

## CSV Import and Export

### Import (participants)
- Use **csv-parse** with `columns: true`, `trim: true`, `skip_empty_lines: true`, and `bom: true`.
- Header matching is case-insensitive in practice (`name`, `Name`, `NAME`, and the same for `email`).
- Rows without a name or email are dropped.
- Expected format:

```csv
name,email
Asha Verma,asha@example.com
"Rao, Kiran",kiran@example.com
```

### Export (events)
- `GET /api/events/export` returns a CSV of the active chapter's events.
- Columns: Title, Type, Date, Venue, Status, Participants, Docs Count.
- Values containing quotes or commas are escaped.
- The file is served with `Content-Disposition: attachment`.

---

## Security Notes

- **Authentication:** Auth.js v5 sessions. `AUTH_SECRET` must be strong and kept private.
- **Authorization:** Every mutation checks membership and role on the server. The chapter ID from the client is never trusted for edit actions. The event's own chapter is used instead.
- **Middleware:** Only checks that a session cookie exists. It is not the security boundary. Pages and actions verify the session with `auth()`.
- **Cookies:** The active-chapter cookie is `httpOnly`, `sameSite: lax`, and `secure` in production.
- **Input validation:** All inputs are validated with Zod (`src/lib/validation/schemas.ts`). Amounts must be non-negative with at most two decimals.
- **Secrets:** Keep `.env` out of Git. Rotate the Gmail App Password and R2 keys if they are exposed.
- **Open question:** Any signed-in user can currently join any chapter as CONTRIBUTOR. Chair approval for new members is planned but not implemented.

---

## Status and Known Limitations

**Working (in the codebase):**
- Sign-in, onboarding, chapter creation and joining, active-chapter switching
- Role-based permissions
- Event create, edit, search, filter, and archive
- Speakers and budget lines with decimal rupee amounts
- Event CSV export
- Participant CSV parsing (library-based)
- Gmail notification service
- Document generation service and route (depends on templates)

**Not complete:**
- `fetchTemplate` returns an empty buffer. Document generation needs real `.docx` templates.
- Certificate template is a mock HTML string, and the QR code is a placeholder.
- Certificate emailing to participants is not implemented.
- The document approval UI is a placeholder ("None pending"). Approve and reject actions are not wired up.
- The archive server action is not yet exported in the final event actions file. Add it to `src/server/actions/events.ts`.
- Member management UI (add, remove, change roles) is limited.
- Tests are placeholders with no assertions. Build passing is the only automated check.
- No rate limiting on the document generation endpoint.

---

## Roadmap

**Near term**
- Real `.docx` templates for each document type
- Approve and reject flow for documents, with decision emails
- Certificate generation with a real template and QR codes
- Email certificates to participants from the imported CSV
- Member management UI (invite, role change, remove)
- Chair approval for new chapter members

**Later**
- Multi-chapter analytics dashboard
- Search across document contents
- Bulk event import
- Automated tests (unit, integration, and Playwright end-to-end)
- Containerization (Docker) and CI/CD (GitHub Actions)
- Optional self-hosting on Docker or Kubernetes

---

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `PrismaClientInitializationError` on Vercel | `DATABASE_URL` is missing or wrong. Confirm the pooled URL is set in Vercel. |
| Migrations fail | Use `DIRECT_URL` (the non-pooled URL) for `prisma migrate deploy`. |
| Redirect loop after sign-in | The middleware sends a signed-in user to `/dashboard`, and the dashboard sends them back to onboarding. Make sure `/onboarding` is not treated as a signed-out-only route. |
| Google sign-in fails with `redirect_uri_mismatch` | The redirect URI in Google Cloud doesn't match `https://<domain>/api/auth/callback/google`. |
| Gmail says "Username and Password not accepted" | Use a 16-character App Password, not your Gmail password. Turn on 2-Step Verification first. |
| Document upload fails with 403 | Check the R2 token permissions and `S3_ENDPOINT`. |
| Budget totals show `NaN` or wrong amounts | Amounts must be stored as rupees (Decimal). Old paise values need the migration. Use `Number(amount)` in UI and templates. |
| Event times are off by 5.5 hours | Datetimes are treated as IST. Check that the form and stored values use `+05:30`. |
| Build fails with `Decimal` type errors | Run `npx prisma generate` after changing the schema. |

---

## Contributing

1. Create a branch from `main`: `git checkout -b feature/your-change`
2. Make your change and keep it focused.
3. Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
4. Open a pull request with a short description and screenshots for UI changes.

**Conventions:**
- TypeScript everywhere. Avoid `any`.
- Put business logic in `src/server/services/`, not in pages or components.
- Enforce permissions in the service layer, not only in the UI.
- Amounts are rupees (`Decimal`). Datetimes are IST unless stored as UTC.

---

## License

To be decided. Until a license is added, all rights are reserved by the authors.

---

## Acknowledgements

Built by the Sapphire team for student chapter documentation.

# LandingPageSaaS

A full-stack SaaS tool for generating, customizing, and exporting landing pages, compliance widgets (cookie banners, age gates), and email newsletter widgets — with AI-assisted copy generation and an admin panel.

**Stack:** React 18 + Tailwind CSS · Node.js + Express · MongoDB (Mongoose) · JWT auth · OpenAI (optional) · Nodemailer

This README is written to double as a **build spec** — it documents not just how to run the app, but every piece of business logic, every data model, and every API contract. It's detailed enough to hand to an AI coding agent (e.g. as a Cowork prompt) to rebuild an equivalent project from scratch.

---

## 1. What This App Does

A logged-in user opens a dashboard and, through step-by-step wizards, generates three kinds of embeddable assets for their own website:

1. **Compliance widgets** — GDPR/CCPA cookie-consent banners and full-page age-verification gates. AI writes the copy and picks a style (icon, colors, animation); the user can also upload a reference screenshot and have the AI replicate its visual design.
2. **Landing pages** — an 800–1000 word AI-written blog-style article with a matching stock hero image ("Create LP for Desktop"). In Step 3 (edit content), the user picks — via a checkbox — how the hero image behaves: a **scroll/parallax background** that stays fixed behind the entire page as it scrolls, or a **single-section background** confined to one block with no scroll effect. The user can also select a **niche** (CBD or Nutra) and, with one extra action, auto-generate four accompanying **compliance pages** — Privacy Policy, Terms, Contact, and Disclaimer — as template-based (non-AI) pages branded to the same domain, listed separately in their own sidebar group.
3. **Popup widgets** — a general-purpose, fully CSS-customizable popup (e.g. an age/interest confirmation-style modal, not tied to any fixed category). No AI-generation step: the user picks a design, edits every visual property live in an editor (image, heading, button text/colors, layout), previews, and saves — same 4-step wizard shell as the other modules, minus the "generate" step.
4. **Email capture / newsletter widgets** — embeddable signup forms. Captured emails can be viewed, exported (XLSX/CSV), and optionally mirrored live to a connected Google Sheet.

Every generated asset is saved server-side as a **Page** document and downloadable as a self-contained HTML/ZIP bundle. An **Admin Panel** sits on top of the same API for user management, per-user feature flags (including per-user authorization to edit their own generated policy-page content), the default CBD/Nutra policy page templates, the global Google Sheet integration, and orphaned-data recovery.

It's built as an internal tool: there's no public marketing site, root path redirects straight to `/login`, and there is no "forgot password" flow.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Tailwind CSS, Axios, JSZip, file-saver |
| Backend | Node.js, Express 4, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, Morgan, `express-validator` |
| Database | MongoDB via Mongoose 8 — 5 collections: User, Page, Template, Email, Setting |
| AI / Content | OpenAI API (`gpt-3.5-turbo` for text, `gpt-4o-mini` for vision) with deterministic offline fallbacks when no key is set |
| Images | Pexels API (optional) or a keyless LoremFlickr fallback |
| Email | Nodemailer (SMTP) rendering local HTML templates with `{{variable}}` substitution |
| Exports | ExcelJS (XLSX), plain-text CSV, Archiver (ZIP) |

---

## 3. Folder Structure

```
LandingPageSaaS/
├── frontend/                        # React + Tailwind client
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── ProtectedRoute.jsx    # auth/role route guard
│   │   │   ├── Stepper.jsx           # wizard step UI used by all module pages
│   │   │   ├── CookieBanner.jsx
│   │   │   └── AgeVerificationModal.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── History.jsx           # list of saved pages (groups Privacy/Terms/Contact/Disclaimer under their parent domain)
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Templates.jsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminPanel.jsx
│   │   │   │   └── PolicyTemplateManager.jsx  # admin editor for default CBD/Nutra policy templates + per-user authorization toggle
│   │   │   └── modules/
│   │   │       ├── CookiePage.jsx
│   │   │       ├── AgeVerification.jsx
│   │   │       ├── EmailNewsletter.jsx
│   │   │       ├── LandingPage.jsx      # standalone Landing Pages module (AI blog + hero image + niche/compliance pages)
│   │   │       └── PopupModule.jsx      # design-select → CSS editor → preview → save (no AI step)
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # JWT auth state/provider
│   │   ├── utils/
│   │   │   ├── api.js               # Axios instance + JWT interceptors
│   │   │   ├── templates.js
│   │   │   └── zipHelper.js         # Bundles generated pages into a .zip client-side
│   │   ├── App.jsx                  # route table
│   │   ├── index.js
│   │   └── index.css                # Tailwind directives + custom components
│   ├── build/                       # Production build output (generated)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── package.json
│
├── backend/                         # Express + MongoDB API
│   ├── config/
│   │   ├── db.js                    # Mongoose connection + admin/demo-user seeding + policy template seeding
│   │   └── jwt.js                   # signToken / verifyToken
│   ├── models/
│   │   ├── User.js
│   │   ├── Page.js
│   │   ├── Template.js
│   │   ├── Email.js
│   │   ├── Setting.js               # single global key/value doc (e.g. Google Sheet webhook)
│   │   └── PolicyTemplate.js        # admin-managed default Privacy/Terms/Contact/Disclaimer content per niche (CBD / Nutra)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── page.controller.js       # CRUD + ZIP download for generated pages
│   │   ├── template.controller.js
│   │   ├── generate.controller.js   # AI copy/landing page generation
│   │   ├── policy.controller.js     # template-based (non-AI) Privacy/Terms/Contact/Disclaimer generation + admin template CRUD
│   │   ├── email-capture.controller.js  # public capture + XLSX/CSV export
│   │   └── admin.controller.js      # user management, stats, orphan-page recovery, policy-edit authorization
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT guard — populates req.user
│   │   ├── admin.middleware.js      # role guard — requires req.user.role === "admin"
│   │   └── validate.middleware.js   # express-validator error formatter
│   ├── routes/                      # one file per resource, mounted in server.js
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── page.routes.js
│   │   ├── template.routes.js
│   │   ├── generate.routes.js
│   │   ├── email-capture.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── email.service.js         # Nodemailer + template rendering
│   │   ├── image.service.js         # Stock image lookup (Pexels or keyless fallback)
│   │   └── openai.service.js        # OpenAI wrapper with offline fallbacks
│   ├── server.js                    # App entry point
│   ├── .env.example
│   └── package.json
│
├── templates/                       # Standalone HTML templates
│   ├── cookie/cookie-banner.html
│   ├── age-verification/age-gate.html
│   └── email/
│       ├── welcome.html
│       ├── password-reset.html
│       └── notification.html
│
├── database/
│   └── schema.sql                   # Legacy MySQL reference schema — historical only, unused at runtime
│
├── start.bat                        # Windows: launches backend + frontend together
└── README.md
```

---

## 4. Data Models (MongoDB / Mongoose)

All collections use Mongoose timestamps (`created_at` / `updated_at`) except `Setting`. Every schema sets `toJSON: { virtuals: true }` so API responses expose a plain `id` string alongside `_id` (important: the frontend reads `.id`, not `._id`, everywhere).

### User
| Field | Type | Notes |
|---|---|---|
| `name` | String | Display name |
| `email` | String | Unique, lowercased — login identifier |
| `password` | String | bcrypt hash, 12 salt rounds |
| `role` | String enum | `"user"` \| `"admin"`, default `"user"` |
| `features_enabled` | Mixed (object) | Per-user feature flags: `cookie_banner`, `age_gate`, `email_newsletter`, `ai_generation`, `custom_templates`, `email_export`, `analytics`, `landing_pages`, `popup_module`, `policy_template_edit` (admin-granted authorization to edit the content of one's own generated policy pages — off by default) |
| `sheet_webhook` | String | Reserved; per-page override lives on `Page` instead |

### Page
A saved, generated asset (landing page / cookie banner / age gate / newsletter widget).
| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId → User | Owner |
| `type` | String enum | `landing` \| `cookie` \| `age-verification` \| `newsletter` \| `popup` \| `privacy` \| `terms` \| `contact` \| `disclaimer` \| `other` |
| `domain` | String | Brand/site name — used as the de-dupe key together with `type` + `user_id`. Policy pages (`privacy`/`terms`/`contact`/`disclaimer`) share the same `domain` as the `landing` page they were generated alongside, which is how they're grouped into one sidebar/History group per project |
| `html_content` | String | Full generated HTML, served on download/export. For `popup` type this is the complete self-contained widget (markup + its own `<style>` block), so no schema change was needed to support the fully CSS-editable popup |
| `sheet_webhook` | String | Optional per-page Google Apps Script webhook URL |
| `image_display_mode` | String enum | `landing` pages only. `scroll` = hero image is a fixed/parallax background spanning the whole page as it scrolls; `single-section` (default) = image is confined to one section's background with no scroll effect. Chosen via a checkbox in Step 3 |
| `niche` | String enum | `cbd` \| `nutra` \| `null`. Set on the `landing` page and copied onto its four generated policy pages; selects which `PolicyTemplate` set is used when generating them |

### Template
| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId → User | Owner |
| `name` | String | Template label |
| `type` | String | `landing` \| `cookie` \| `age-verification` \| `email` \| `other` |
| `content` | String | Saved HTML/content body |

### Email
One row per (page, subscriber email) pair — captured from a published widget.
| Field | Type | Notes |
|---|---|---|
| `page_id` | ObjectId → Page | Which widget captured it |
| `email` | String | Lowercased; **unique together with `page_id`** (prevents duplicate signups) |

### Setting
A generic key/value document. Used today only for `key: "global_sheet_webhook"` — the admin-configured fallback Google Sheet URL.

### PolicyTemplate
Admin-managed default content for the four auto-generated compliance pages, one document per `(type, niche)` combination.
| Field | Type | Notes |
|---|---|---|
| `type` | String enum | `privacy` \| `terms` \| `contact` \| `disclaimer` |
| `niche` | String enum | `cbd` \| `nutra` |
| `header_content` | String | Static header/nav markup, shared across a niche's pages |
| `body_content` | String | Static body copy with `{{domain}}` / `{{brand}}` placeholders — kept short and Google-Ads-safe by design, not AI-generated |
| `footer_content` | String | Static footer markup |
| `updated_by` | ObjectId → User | Which admin last edited this template |

Unique together on `(type, niche)` — one editable default per policy page per niche. Regular users never edit this collection directly; a user can only edit the *generated copy* on their own `Page` document, and only if their `features_enabled.policy_template_edit` flag has been turned on by an admin.

---

## 5. Authentication & Authorization

- **Register** (`POST /api/auth/register`) — validates input with `express-validator`, lowercases + uniqueness-checks the email, hashes the password (bcrypt, 12 rounds), creates the `User` with default feature flags, returns a signed JWT (`{ id, email, role }`) + user summary.
- **Login** (`POST /api/auth/login`) — looks up by email, `bcrypt.compare`s the password, returns the same JWT shape.
- **`GET /api/auth/me`** — decodes the bearer token and returns the fresh user record; the frontend calls this on every app load to restore the session.
- **`auth.middleware.js`** — reads `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, attaches the payload to `req.user`. Every resource route (pages, templates, generate, email stats/exports, users, admin) sits behind this.
- **`admin.middleware.js`** — layered on top for `/api/admin/*`; rejects with 403 unless `req.user.role === "admin"`.
- **Frontend session handling:**
  - `AuthContext.jsx` stores the JWT in `localStorage`, exposes `{ user, loading, login, logout }`.
  - `utils/api.js` is a single shared Axios instance: a request interceptor attaches the bearer token to every call; a response interceptor auto-logs-out and redirects to `/login` on a `401` — **except** for the `/api/auth/login` and `/api/auth/register` calls themselves, where a 401/409 just means "wrong credentials" / "email in use", not an expired session. (Getting this exclusion wrong makes login error messages flash and vanish instantly — the whole page hard-redirects before the user can read them.)
  - `ProtectedRoute.jsx` wraps dashboard/admin routes: shows a spinner while the session check is in flight, redirects unauthenticated users to `/login`, and redirects non-admins away from admin-only routes.

---

## 6. Core Business Logic by Feature

### 6.1 Page save / upsert logic
A page is uniquely identified by `(user_id, type, domain)`. On create, if a page already exists with that combination, its `html_content` and `sheet_webhook` are overwritten in place instead of inserting a duplicate — one persistent save slot per project, not an ever-growing history every time the user re-generates the same asset.

### 6.2 AI content generation
- **`POST /api/generate`** (cookie / age-gate / newsletter copy) — builds a prompt asking the model to return a strict JSON object of copy + style fields (headline, colors, icon, button text, animation, etc). If a **reference screenshot** is supplied, it switches to a `gpt-4o-mini` vision prompt asking the model to replicate the screenshot's visual design (colors, weights, wording) as closely as possible. If `OPENAI_API_KEY` is missing or the call fails, a **deterministic offline fallback** returns sensible default copy per widget type so the builder keeps working with zero configuration.
- **`POST /api/generate/landing`** — asks `gpt-3.5-turbo` for an 800–1000 word structured blog article (title, intro, quote, 5–7 sections), then calls `image.service.fetchStockImage()` with the AI's suggested image keyword (falling back to industry, then domain) to attach a matching hero photo. Same offline-fallback pattern if the AI call fails.

### 6.3 Stock images
If `PEXELS_API_KEY` is set, does one landscape-orientation search against the Pexels API. Otherwise falls back to LoremFlickr, tagging the request with the same keyword so the placeholder still visually matches the content niche — no signup required for local dev. This image lookup is only ever called for the `landing` (index) page itself — the four generated policy pages never call the image API or the AI service.

### 6.3a Hero image display mode (Step 3)
A checkbox on the landing-page Step 3 editor sets `Page.image_display_mode`:
- **`scroll`** — the hero image is rendered as a fixed/parallax background (`background-attachment: fixed` and full-page sizing) so it stays put behind the whole page as the visitor scrolls.
- **`single-section`** (default) — the same image is scoped as the background of just the hero section; no parallax, no scroll effect.

This only changes the generated CSS/markup wrapping the image — the AI-generation and image-lookup steps (6.2 / 6.3) are unaffected either way.

### 6.3b Policy page generation (template-based, non-AI)
When creating a `landing` page, the user can optionally pick a **niche** (`cbd` or `nutra`) and trigger `POST /api/generate/policy-pages`, which:
1. Looks up the four `PolicyTemplate` documents matching `{ niche }` (one each for `privacy`, `terms`, `contact`, `disclaimer`).
2. Substitutes `{{domain}}` / `{{brand}}` placeholders in each template's `header_content` / `body_content` / `footer_content` with the landing page's own domain/brand name.
3. Creates four new `Page` documents (one per type) with that same `domain`, so they de-dupe/upsert the same way as any other page (§6.1) and group together with their parent landing page in the sidebar/History.

Each generated page is intentionally minimal — header, a short block of static body copy, and a footer — with no AI call and no image-API call, by design: fast, predictable, and written to be Google Ads-compliant out of the box. A user can edit the resulting page's own content afterward only if an admin has turned on their `features_enabled.policy_template_edit` flag; otherwise the page is regenerate-only. Admins manage the shared `PolicyTemplate` defaults (and grant/revoke that per-user edit flag) from the **Policy Template Manager** in the Admin Panel.

### 6.3c Popup module
A separate, category-agnostic module (not AI-generated, not a "compliance widget"): the user picks a starting design (a `Template`-shaped design object with `type: "popup"`), then a live editor lets them change every CSS-driven property — image, heading/body text, button labels and colors, background, spacing — with an instant preview. Saving creates/updates a `Page` with `type: "popup"` whose `html_content` is the fully self-contained widget (markup + its own `<style>` block), reusing the exact same save/download/ZIP pipeline as every other module (§6.6) with no generation step in between.

### 6.4 Email capture & Google Sheet sync
- **`POST /api/emails/capture`** (public) — verifies the target page exists, stores the `(page_id, email)` pair (duplicates silently ignored via the unique index), then if a Google Apps Script webhook is configured — per-page (`Page.sheet_webhook`) or globally (`Setting["global_sheet_webhook"]`) — fires an **unawaited** POST to it, so a slow/broken sheet integration never blocks the visitor's submission.
- **`GET /api/emails/stats`** — aggregates, per page owned by the caller, the total captured-email count via a Mongo `$lookup` + `$size` aggregation pipeline.
- **Export endpoints** (`/:pageId/export/xlsx`, `/export/csv`) — owner-scoped; accept the JWT either as a normal header or as a `?token=` query param, so the frontend can trigger a download via a plain `window.open()` link (no way to attach a header there).

### 6.5 Admin panel
- **User management** — list/create/update/delete users, toggle each user's `features_enabled` flags (controls which builder modules a given account can access, including `popup_module` and `landing_pages`).
- **Platform stats** — total users / pages / captured emails.
- **Global Google Sheet** — get/set the shared Apps Script webhook, used as the fallback destination when a page has no per-page override. Validated to be an `https://script.google.com/...` URL before saving.
- **Orphan-page recovery** — finds `Page` documents whose `user_id` no longer matches any existing `User` (e.g. after a user was deleted) and lets an admin bulk-reassign them to a chosen (existing) user by email — a data-integrity safety net.
- **Policy Template Manager** — admin-only CRUD over the `PolicyTemplate` collection: edit the default `header_content` / `body_content` / `footer_content` for each `(type, niche)` pair (CBD and Nutra each get their own four templates). Also where an admin flips a specific user's `features_enabled.policy_template_edit` flag on or off — regular users never create or edit templates themselves; they only pick a niche and, if authorized, tweak their own already-generated page copy.

### 6.6 Downloads & exports
- Page download (`GET /api/pages/:id/download`) streams the saved `html_content` back as a ZIP (`index.html`) via Archiver.
- Frontend `zipHelper.js` bundles generated assets client-side with JSZip + file-saver for instant local downloads without a round-trip.
- Subscriber export: ExcelJS builds a formatted `.xlsx`; the CSV path streams a plain comma-joined string. Both scoped to pages the requesting user owns.

### 6.7 Transactional email
Loads the matching HTML file from `templates/email/<name>.html`, does a simple `{{variable}}` string replacement, sends via Nodemailer using `SMTP_*` credentials.

---

## 7. Frontend Architecture

- **Routing (`App.jsx`)** — React Router 6 with three groups: public (`/login`, `/register`), a protected `/dashboard` shell (`DashboardLayout` + `Sidebar`) nesting `Dashboard`, `CookiePage`, `AgeVerification`, `EmailNewsletter`, `LandingPage`, `PopupModule`, `History`; and a protected + admin-only `/admin` shell nesting `AdminPanel` and `PolicyTemplateManager`. Root path and unknown paths redirect to `/login`.
- **State & data flow:**
  - `AuthContext` is the single source of truth for the logged-in user, consumed via `useAuth()`.
  - `api.js` is the only place JWT attachment and 401-handling live — every component imports it instead of calling `axios` directly.
  - Each AI-backed module page (`CookiePage`, `AgeVerification`, `EmailNewsletter`, and `LandingPage`) drives a step-by-step wizard (`Stepper.jsx`): collect inputs → call `/api/generate` → preview the AI result → save via `/api/pages` → offer a ZIP download. `LandingPage`'s Step 3 also exposes the scroll-vs-single-section image checkbox and, optionally, a niche picker that fires `/api/generate/policy-pages`.
  - `PopupModule.jsx` uses the same `Stepper.jsx` shell but skips the generate step entirely: pick a design → live CSS/content editor → preview → save via `/api/pages`.
  - `History.jsx` lists previously saved pages (`GET /api/pages`), grouping `privacy`/`terms`/`contact`/`disclaimer` pages under their parent landing page's domain, with links to re-open, re-download, or view captured emails/stats.
  - `AdminPanel.jsx` is the admin-only surface over `/api/admin/*`; `PolicyTemplateManager.jsx` is its dedicated screen for editing the CBD/Nutra default `PolicyTemplate` docs and toggling per-user `policy_template_edit` authorization.

---

## 8. Quick Start

> **A MongoDB instance is required.** Run one locally (`mongod` / Docker /
> MongoDB Compass) or use a free [MongoDB Atlas](https://www.mongodb.com/atlas)
> cluster, then point `MONGODB_URI` at it. On first successful connection the
> backend seeds an admin login, a demo user login, and the default CBD/Nutra
> policy templates automatically.

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd LandingPageSaaS

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

| Variable | Needed for |
|----------|-----------|
| `MONGODB_URI` | **Required.** Connection string, e.g. `mongodb://127.0.0.1:27017/landingpagesaas` or an Atlas SRV URI |
| `OPENAI_API_KEY` | AI copy + landing page generation (otherwise offline fallback content is used) |
| `PEXELS_API_KEY` | Real stock photos for generated pages (otherwise a keyless image source is used) |
| `SMTP_*` | Sending emails (welcome, password reset, notifications) |
| `JWT_SECRET` | Set your own for production |

> The frontend needs no config unless the backend runs on a non-default port
> (`REACT_APP_API_URL` in `frontend/.env`).

### 3. Run in development

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:3000)
cd frontend && npm start
```

On Windows you can also just double-click **`start.bat`** in the project root to
launch both at once.

### 4. Log in

Default accounts are seeded on first run (see `backend/config/db.js`):

| Role | Email | Password |
|------|-------|----------|
| admin | value of `SEED_ADMIN_EMAIL` (defaults to the admin's configured email) | value of `SEED_ADMIN_PASSWORD` (default `admin123`) |
| user | `vishal@launchigo.in` | value of `SEED_USER_PASSWORD` (default `vishal123`) |

Override these with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD`
in `backend/.env` before first run (seeding only happens if the account doesn't
already exist).

---

## 9. API Reference

All protected routes require `Authorization: Bearer <token>` (returned from login/register).

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Login, returns JWT |
| GET | `/me` | JWT | Get current user (from token) |

### Users (`/api/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | JWT | Get own profile |
| PUT | `/me` | JWT | Update profile (name / password) |
| DELETE | `/me` | JWT | Delete own account |
| GET | `/me/sheet` | JWT | Get the admin-configured global Google Sheet webhook |

### Pages (`/api/pages`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List own generated pages |
| GET | `/:id` | JWT | Get a single page |
| GET | `/:id/download` | JWT | Download a page as a standalone HTML/zip bundle |
| POST | `/` | JWT | Create (or upsert by `user + type + domain`) a page |
| PUT | `/:id` | JWT | Update a page |
| DELETE | `/:id` | JWT | Delete a page |

### Templates (`/api/templates`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List templates |
| GET | `/:id` | JWT | Get a single template |
| POST | `/` | JWT | Create a template |
| PUT | `/:id` | JWT | Update a template |
| DELETE | `/:id` | JWT | Delete a template |

### Generate (`/api/generate`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Generate AI copy for cookie / age-gate / newsletter |
| POST | `/landing` | JWT | Generate AI blog-style landing page + stock image |
| POST | `/policy-pages` | JWT | Template-based (non-AI): generate Privacy/Terms/Contact/Disclaimer pages for a domain + niche, from the matching `PolicyTemplate` defaults |

### Email capture (`/api/emails`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/capture` | — | Public endpoint: capture an email from a published page/newsletter widget |
| GET | `/stats` | JWT | Aggregate capture stats |
| GET | `/:pageId` | JWT | List captured emails for a page |
| GET | `/:pageId/export/xlsx` | JWT (header or `?token=`) | Export captured emails as Excel |
| GET | `/:pageId/export/csv` | JWT (header or `?token=`) | Export captured emails as CSV |

### Admin (`/api/admin`) — requires `role: admin`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Platform-wide stats |
| GET | `/users` | List all users |
| POST | `/users` | Create a user |
| PUT | `/users/:id` | Update a user |
| DELETE | `/users/:id` | Delete a user |
| PUT | `/users/:id/features` | Toggle feature flags for a user |
| GET | `/sheet` | Get the global Google Sheet webhook URL |
| PUT | `/sheet` | Set the global Google Sheet webhook URL |
| GET | `/orphan-pages` | List pages with no owning user (data-integrity check) |
| POST | `/recover-pages` | Reassign/recover orphaned pages |
| GET | `/policy-templates` | List the default `PolicyTemplate` docs (one per `type` × `niche`) |
| PUT | `/policy-templates/:id` | Edit a niche's default header/body/footer content |
| PUT | `/users/:id/policy-authorization` | Grant/revoke that user's `features_enabled.policy_template_edit` flag |

### Misc
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (`{ status: "ok", ts }`) |

---

## 10. Standalone HTML Templates

### Cookie Banner (`templates/cookie/cookie-banner.html`)
Drop-in GDPR/CCPA cookie consent banner with Accept / Decline / Settings actions. Supports a custom background image.

### Age Gate (`templates/age-verification/age-gate.html`)
Full-page age verification wall. Redirects underage visitors away and stores session verification.

### Email Templates (`templates/email/`)
| File | Use |
|------|-----|
| `welcome.html` | Sent on registration. Variables: `{{name}}`, `{{dashboard_url}}` |
| `password-reset.html` | Sent on forgot-password. Variables: `{{email}}`, `{{reset_url}}` |
| `notification.html` | Generic notification. Variables: `{{heading}}`, `{{body}}`, `{{cta_url}}`, `{{cta_label}}` |

The backend `email.service.js` replaces `{{variable}}` placeholders automatically.

---

## 11. Environment Variables

### Backend (`backend/.env`)

All variables are **optional** except `MONGODB_URI` — the app otherwise runs with sensible defaults.

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string (default `mongodb://127.0.0.1:27017/landingpagesaas`) |
| `JWT_SECRET` | Secret for signing tokens — set your own for production |
| `JWT_EXPIRES_IN` | Token TTL (e.g. `7d`) |
| `OPENAI_API_KEY` | AI copy + landing page generation (falls back to offline content if unset) |
| `PEXELS_API_KEY` | Real stock images for landing pages (keyless source used if unset) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email SMTP config |
| `EMAIL_FROM` | From-address used on outgoing emails |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Override the seeded admin login |
| `SEED_USER_PASSWORD` | Override the seeded demo user's password |
| `CLIENT_URL` | Frontend origin for CORS |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend base URL (default `http://localhost:5000`) |

---

## 12. Production Build

```bash
cd frontend && npm run build
```

Serve the `frontend/build` folder with Nginx, Caddy, or any static host. Point the API proxy to your backend.

---

## 13. Notes & Gotchas

- `database/schema.sql` describes a legacy MySQL schema and is kept for historical reference only — the app does **not** read it at runtime. Collections/documents are defined by the Mongoose models in `backend/models/`. IDs are MongoDB `ObjectId`s (24-char hex strings), not auto-increment integers.
- Every Mongoose schema sets `toJSON: { virtuals: true }` so responses include a plain `id` string. **This matters** — the frontend reads `.id` on every user/page/template object, not `._id`; omitting the virtual makes edit/delete/toggle actions send `"undefined"` as the ID and 500 with `Cast to ObjectId failed`.
- The Axios response interceptor's 401 auto-redirect must exclude the login/register calls themselves (see §5) — otherwise wrong-password error messages flash and disappear before the user can read them.
- Seeded credentials are for local development only — change them (or set `SEED_ADMIN_*` / `SEED_USER_PASSWORD`) before deploying anywhere reachable by others.
- `image_display_mode` and `niche` are optional fields — existing `landing` pages created before this feature simply read as `undefined`/`null` and the frontend should treat that the same as `single-section` / no-niche rather than erroring.
- `PolicyTemplate.body_content` must keep its `{{domain}}` / `{{brand}}` placeholders literal (not pre-filled) — substitution only happens at generation time in `policy.controller.js`, the same pattern `email.service.js` uses for `{{variable}}` in transactional emails (§6.7).
- Policy pages are deliberately **never** routed through `openai.service.js` or `image.service.js` — keeping them template-only is what keeps them fast, predictable, and safe to regenerate in bulk when an admin edits a shared `PolicyTemplate`.

---

## License

MIT

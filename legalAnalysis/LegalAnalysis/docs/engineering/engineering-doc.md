# ContractIQ — Engineering Document (High-Level Design)

**Version:** 1.0
**Date:** 2026-07-16
**Status:** Draft — Pending Approval Before Implementation
**Based on PRD:** `docs/ContractIQ_PRD.md` v1.0 (June 24, 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Scope](#2-product-scope)
3. [User Personas](#3-user-personas)
4. [User Flows](#4-user-flows)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Design and Schema](#7-database-design-and-schema)
8. [AI Architecture](#8-ai-architecture)
9. [API Specification](#9-api-specification)
10. [Feature Breakdown](#10-feature-breakdown)
11. [Folder Structure](#11-folder-structure)
12. [Naming Conventions](#12-naming-conventions)
13. [Testing Strategy](#13-testing-strategy)
14. [Specs-to-Implementation Mapping](#14-specs-to-implementation-mapping)

---

## 1. Executive Summary

### Project Name
ContractIQ

### Business Goal
Make NDA and MSA contract review accessible to every SMB founder, operations manager, and freelancer — without a lawyer on call. ContractIQ reduces the time from contract upload to a completed key-term review from 90–120 minutes (manual) to ≤ 15 minutes, at a cost lower than 5 minutes of legal billing time.

### Problem Statement
Business professionals at companies without in-house legal counsel routinely sign NDAs and MSAs they don't fully understand. Manual review is slow (90–120 min per contract), expensive ($250–$500/hr for ad-hoc legal consultation), and error-prone — auto-renewal clauses, indemnification limits, and IP assignment terms are frequently missed. Existing AI tools (ChatGPT) produce unstructured summaries with no page references, no confidence scores, and no contract-type-specific term libraries. Enterprise CLM tools (DocuSign, Ironclad) start at $50k/year — inaccessible to SMBs.

### Target Users
- **Primary:** Founders, COOs, Procurement Managers at 5–250-employee companies with no in-house legal team (SaaS, agencies, fintech, e-commerce, professional services)
- **Secondary:** Freelancers and independent consultants receiving MSAs from larger clients

### Success Criteria

| Metric | Target |
|---|---|
| End-to-end review time (upload → review complete) | ≤ 15 minutes |
| Key term extraction accuracy (F1) | ≥ 88% NDA / ≥ 85% MSA |
| Extraction latency P95 (≤ 20 pages) | ≤ 30 seconds |
| Chat response latency P95 | ≤ 15 seconds |
| 30-day user retention | ≥ 45% |
| AI term correction rate | ≤ 12% of extracted terms |
| Cost per 20-page contract analysis | ≤ $0.25 |
| Net Promoter Score | ≥ 40 |

---

## 2. Product Scope

### In Scope — MVP (v0.1 through v1.0)

- **Contract types:** NDA and MSA only
- **Languages:** English only
- **Jurisdictions:** US and UK law conventions
- **Document types:** Text-layer PDFs (not scanned/image PDFs)
- **File limits:** ≤ 10 MB, ≤ 20 pages, ≤ 15,000 tokens
- **Auth:** Email/password via Supabase Auth
- **Core workflow:** Upload PDF → Extract text → AI key term extraction → Results display (key terms panel + inline PDF viewer) → Chat with contract
- **Custom terms:** Up to 5 user-defined terms per analysis
- **Confidence scoring:** Per-term confidence score (0–100%) with colour coding and ⚠️ warnings below 50%
- **Source attribution:** Verbatim source sentence + 1-indexed page number per extracted term
- **Inline PDF viewer:** PDF.js rendering with page navigation from key term clicks; text viewer fallback when Storage is unavailable
- **Chat:** GPT-4o, document-grounded, mandatory page citations, persistent per contract
- **Dashboard:** Contract history list, sortable, with stats (total count, NDA/MSA breakdown)
- **Inline term editing:** User corrections saved with "Edited" badge; original AI value retained
- **Feedback collection:** Thumbs up/down + optional comment per contract review (P2, in v1.0)
- **Hallucination guardrails:** Confidence warnings, source sentences, document-only chat prompt, legal disclaimer on every results page
- **Security:** Supabase RLS on all tables; OpenAI key server-side only; signed Storage URLs (1-hr expiry); AES-256 at rest; TLS 1.3 in transit
- **Data retention:** PDFs retained 90 days post last-access; user-initiated deletion removes all associated data

### Out of Scope — MVP

- Scanned / image PDFs (OCR deferred to v1.2)
- Non-English contracts
- Non-US / non-UK contract conventions
- Export to CSV or PDF report (v1.1)
- Batch contract upload (v1.1)
- Multi-user team workspaces (v1.2)
- Contract comparison view (v1.2)
- Email notifications on processing completion (v1.2)
- Fine-tuning GPT-4o on ContractIQ data (v2.0)
- Dashboard analytics charts (v1.1)
- API access for third-party integrations (Pro plan, post-launch)
- Native desktop or mobile apps

### Future Enhancements (v1.1–v1.2)

| Version | Feature |
|---|---|
| v1.1 | Export key terms to CSV; export results summary to PDF; batch upload (up to 5 contracts); dashboard analytics charts |
| v1.2 | Scanned PDF support (AWS Textract OCR); contract comparison (side-by-side key terms); email notifications; multi-user workspaces (team plans) |

---

## 3. User Personas

### Persona 1 — The Time-Pressed Founder / Ops Lead (Primary)

| Attribute | Detail |
|---|---|
| **Role** | Founder, COO, Procurement Manager, Legal Operations Manager |
| **Industry** | SaaS, agency, professional services, fintech, e-commerce |
| **Company size** | 5–250 employees |
| **Legal resources** | No in-house legal counsel; uses ad-hoc consultations at $250–$500/hr |
| **Contract volume** | 5–15 NDAs or MSAs per month |
| **Current behavior** | Spends 90–120 min per contract review; searches Google for clause explanations; pays for one-off legal consultations for high-stakes contracts |
| **Core pain** | Misses auto-renewal clauses, indemnification limits, IP assignment terms; review takes too long for routine agreements |
| **Primary workflow in ContractIQ** | Upload PDF → review extracted key terms → verify any low-confidence terms → ask follow-up questions via chat → sign with confidence |
| **Permissions** | Full access to all features on their account |
| **Success state** | Completes a meaningful review in ≤ 15 minutes; never misses a critical clause |

### Persona 2 — The Freelancer / Consultant (Secondary)

| Attribute | Detail |
|---|---|
| **Role** | Independent designer, marketing consultant, software developer, management consultant |
| **Company size** | Solo / 1–5 person micro-business |
| **Contract volume** | 1–4 MSAs per month from larger enterprise clients |
| **Current behavior** | Often signs without reading carefully; feels power imbalance discourages pushback; cannot justify $500 legal review for a $5k project |
| **Core pain** | Cannot identify non-standard or risky clauses; no tool surfaces page-level references with confidence scores |
| **Primary workflow in ContractIQ** | Upload client MSA → focus on high-risk terms (liability cap, IP ownership, non-solicitation) → chat with contract to understand specific clause implications |
| **Permissions** | Same as primary persona; on Starter plan |
| **Success state** | Understands what they're signing; can push back on unfair terms with specific page references |

---

## 4. User Flows

### Flow 1 — New Visitor → Sign Up → Dashboard

```
User Action         → Frontend Behavior                  → Backend Processing           → Database Interaction                          → System Response
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Lands on /          → Renders landing page (static)      → None                         → None                                         → Marketing page with CTAs
Clicks "Get Started"→ Opens AuthModal (sign-up tab)      → None                         → None                                         → Email + password form
Submits credentials → Validates email format + pw length → Supabase Auth: createUser()  → Supabase inserts user into auth.users         → On success: redirect to /dashboard
                                                                                          (email verification email sent)
Clicks verify link  → Email verification callback         → Supabase confirms email      → auth.users.email_confirmed_at set             → Redirect to /dashboard
Arrives at /dashboard→ Renders empty state               → None                         → None                                         → "No contracts yet — upload your first"
```

**Error states:** Invalid email format → inline field error. Duplicate email → "An account with this email already exists." Password < 8 chars → inline validation. Auth service timeout → "Sign-up failed — please try again."

---

### Flow 2 — Returning User → Sign In → Dashboard

```
User Action         → Frontend Behavior                  → Backend Processing           → Database Interaction                          → System Response
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Lands on /          → Checks Supabase session cookie      → Supabase Auth: getSession() → None (session in cookie)                     → If session valid: redirect to /dashboard
Clicks "Sign In"    → Opens AuthModal (sign-in tab)       → None                        → None                                         → Email + password form
Submits credentials → Calls supabase.auth.signInWithPassword()→ Validates session      → auth.sessions updated                         → Redirect to /dashboard
Arrives /dashboard  → Fetches contract history            → GET /api/dashboard          → SELECT * FROM contracts WHERE user_id = auth.uid() ORDER BY created_at DESC
                                                                                                                                        → Contract list, NDA/MSA counts displayed
```

**Error states:** Invalid credentials → "Incorrect email or password." Too many attempts → "Too many sign-in attempts. Please wait 60 seconds."

---

### Flow 3 — Core Contract Review

```
User Action                    → Frontend Behavior                         → Backend Processing                          → Database Interaction                                              → System Response
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Clicks "Review a Contract"     → Navigate to /upload                       → None                                        → None                                                              → Upload screen renders
Selects contract type (NDA/MSA)→ Updates ContractTypeSelector state         → None                                        → None                                                              → Key term preview list shown
Drops PDF onto uploader        → File validated (≤10MB, .pdf, ≤20 pages)   → None (client-side validation)              → None                                                              → "Ready to process" state shown
                                                                            → POST /api/contracts/upload                  → INSERT INTO contracts (user_id, name, type, status='pending')   → contract_id returned
                                                                            → pdf-parse extracts text + [PAGE N] markers  → UPDATE contracts SET contract_text=..., page_count=..., status='processing'→ PDF stored in Supabase Storage
                                                                            → Async: Storage upload (non-blocking)        → UPDATE contracts SET file_path=... (if storage succeeds)

(Optional) Adds custom terms   → CustomTermInput appends terms to list      → None                                        → None                                                              → Preview list shows "Custom" badge

Clicks "Process Contract"      → Progress indicator (3 steps)              → POST /api/contracts/[id]/process            → SELECT contract_text FROM contracts                               → Step 1: "Extracting text" (done)
                                                                            → Build few-shot prompt (NDA or MSA)          →                                                                    → Step 2: "Analysing with AI"
                                                                            → Call GPT-4o (JSON mode, temp 0.1)           → INSERT INTO key_terms (all extracted terms)                       → Step 3: "Compiling results"
                                                                            → Parse JSON response                         → UPDATE contracts SET status='complete'                            → Redirect to /results/[id]
                                                                            → If JSON parse fails: retry once             →

Arrives at /results/[id]       → Two-panel layout renders                  → GET /api/contracts/[id]                     → SELECT * FROM contracts + key_terms WHERE contract_id=?           → PDF viewer (left) + Key Terms panel (right)
Clicks term page number        → PDFViewer.scrollToPage(pageNumber)        → None                                        → None                                                              → PDF scrolls to that page with highlight
Expands "Why?" on a term       → SourceSentenceTooltip renders             → None                                        → None                                                              → Verbatim source sentence shown
Clicks edit on a term          → TermCard enters edit mode                 → PATCH /api/contracts/[id]/terms/[termId]    → UPDATE key_terms SET value=..., original_ai_value=..., is_edited=true→ "Edited" badge appears
```

**Error states:**
- Scanned PDF (< 100 words extracted) → "This appears to be a scanned PDF. Scanned PDFs are not supported yet."
- PDF > 10 MB → "File is too large. Maximum file size is 10 MB."
- PDF > 20 pages → "Document exceeds 20 pages. Contracts over 20 pages are not supported in this version."
- Contract > 15,000 tokens → "This contract is too long for analysis. Support for longer contracts is coming soon."
- OpenAI API failure → 3 retries with exponential backoff → "Analysis failed. Please try again in a few minutes." CTA button. `contract.status = 'error'`.
- OpenAI timeout → Same as API failure; user can retry without re-uploading.

---

### Flow 4 — Chat with Contract

```
User Action                  → Frontend Behavior                        → Backend Processing                          → Database Interaction                                              → System Response
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Clicks "Chat" tab            → ChatInterface panel opens                → GET /api/contracts/[id]/chat               → SELECT * FROM chat_messages WHERE session_id=? ORDER BY created_at ASC→ Previous messages loaded (if any)
Types question and submits   → Message appended to chat UI (right)     → POST /api/contracts/[id]/chat              → SELECT contract_text FROM contracts                               → Spinner appears below last message
                              → Input disabled during request           → Load full message history (up to 200)      → INSERT INTO chat_messages (role='user', content=question)
                                                                        → Classify query (contract/history/both)
                                                                        → Build chat prompt:
                                                                            system: "Answer only from doc. Cite [Page X]."
                                                                            context: full contract_text
                                                                            history: all prior messages
                                                                        → Call GPT-4o (temp 0.4, max 1000 tokens)
                                                                        → Parse response, extract [Page X] citation   → INSERT INTO chat_messages (role='assistant', content=response)   → AI response rendered (left, "Based on the document...")
Clicks [Page X] citation     → PDFViewer.scrollToPage(X)               → None                                        → None                                                              → PDF scrolls to cited page
Revisits /results/[id] later → Chat history auto-loaded                 → GET /api/contracts/[id]/chat               → SELECT from chat_messages                                         → Full conversation restored
```

**Error states:** Chat response > 15 s → spinner persists; if no response after 20 s (OpenAI timeout): "Response timed out. Please try again." Off-document question → AI responds "I cannot find this in the document" (expected, not an error).

---

## 5. Frontend Architecture

### Framework & Core Libraries

| Technology | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Fixed per engineering-planner skill |
| Styling | Tailwind CSS | Utility-first; fast iteration; no runtime CSS overhead |
| PDF Rendering | PDF.js (client-side) | No server rendering load; page navigation + zoom; lazy page loading for large files |
| State Management | React Context + useState | Sufficient for MVP auth/session state; no need for Redux/Zustand at this scale |
| Realtime | Supabase Realtime (optional) | Chat message streaming; can degrade to polling if disabled |
| Form validation | Native HTML5 + custom hooks | No external form library needed for MVP's simple forms |

### Page Routes

| Route | Protection | Purpose |
|---|---|---|
| `/` | Public | Landing page — marketing copy, value prop, demo GIF, Sign In / Get Started CTAs |
| `/login` | Public (redirect to /dashboard if already authed) | Sign-in form |
| `/signup` | Public (redirect to /dashboard if already authed) | Sign-up form |
| `/dashboard` | Protected | Contract history, stats (total, NDA/MSA counts), "Review a Contract" CTA |
| `/upload` | Protected | Contract type selector, PDF drag-and-drop, custom term addition, pre-processing preview |
| `/results/[contractId]` | Protected (must own contract) | Two-panel: PDF/text viewer + key terms panel + chat tab |

### Page & Component Hierarchy

```
layout.tsx (global nav, disclaimer banner, auth provider)
├── page.tsx (Landing)
│   └── AuthModal (sign-in / sign-up tabs)
├── dashboard/page.tsx
│   ├── DashboardStats (total contracts, NDA/MSA count)
│   └── DashboardTable (contract rows: name, type, date, status)
├── upload/page.tsx
│   ├── ContractTypeSelector (NDA / MSA dropdown)
│   ├── PDFUploader (drag-and-drop zone, file validation)
│   ├── KeyTermPreview (list of standard terms for selected type)
│   ├── CustomTermInput (text field + Add button, max 5)
│   └── ProcessButton (triggers extraction)
└── results/[contractId]/page.tsx
    ├── DisclaimerBanner ("Not legal advice...")
    ├── PDFViewer (PDF.js; receives targetPage prop)
    │   └── TextViewerFallback (parses [PAGE N] markers from contract_text; same targetPage prop)
    ├── KeyTermsPanel
    │   └── TermCard (term name, value, page link, ConfidenceBadge, SourceSentenceTooltip, edit mode)
    │       ├── ConfidenceBadge (green/amber/red + ⚠️ icon below 50%)
    │       └── SourceSentenceTooltip (expandable "Why?" section)
    ├── ChatInterface (tab/sidebar)
    │   └── ChatMessage (role-aligned, [Page X] citation as clickable link)
    └── FeedbackWidget (thumbs up/down + comment textarea)
```

### State Management Design

| State | Location | How Updated |
|---|---|---|
| Auth session | `AuthContext` (React Context) | Supabase `onAuthStateChange` listener |
| Contract data + key terms | `/results/[contractId]/page.tsx` local state | Fetched on mount via `GET /api/contracts/[id]` |
| Chat messages | `useChat` hook | Fetched on mount; new messages appended optimistically |
| Current PDF page | `/results/[contractId]/page.tsx` local state | Updated by TermCard page-click events; consumed by PDFViewer + TextViewerFallback |
| Upload progress | `/upload/page.tsx` local state | Updated by upload API call stages (upload → extract → process) |
| Custom terms list | `/upload/page.tsx` local state | User adds/removes terms before processing |

### UX States

| Situation | UI Treatment |
|---|---|
| Dashboard — no contracts yet | Illustration + "Upload your first contract to begin" |
| Upload — file validating | Inline spinner on drop zone |
| Processing — 3 stages | Progress indicator: "Extracting text → Analysing with AI → Compiling results" with step completion checkmarks |
| Results — key terms loading | Skeleton cards in key terms panel |
| Chat — awaiting response | Typing indicator dots (left-aligned) |
| Term confidence < 50% | ⚠️ icon, amber/red badge, non-dismissible tooltip |
| OpenAI error | ErrorBanner with "Try Again" CTA; contract retains `status = 'error'` |
| Storage unavailable | PDFViewer hidden; TextViewerFallback renders silently (no user-visible error for this specific failure) |
| Scanned PDF detected | Upload error: "Scanned PDFs are not supported yet." File rejected before processing |

### Accessibility (WCAG 2.1 AA)

- All interactive elements have `aria-label` or associated `<label>`
- Confidence badges use colour **plus** icon (not colour alone) — ⚠️ for low, ✓ for high
- PDF viewer keyboard-navigable (arrow keys for page scroll)
- All tooltips triggerable by keyboard (focus + Enter)
- Legal jargon terms in key terms panel have plain-English explanations in tooltips
- "Not legal advice" disclaimer always visible, not hideable

---

## 6. Backend Architecture

### Runtime & Hosting

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Vercel (zero-config, edge CDN) |
| Backend API | Next.js API Routes (Node.js runtime) | Vercel Serverless Functions |
| Edge functions (heavy AI ops) | Supabase Edge Functions (Deno) | Supabase managed infrastructure |
| Database | PostgreSQL (Supabase managed) | Supabase |
| File Storage | Supabase Storage | Supabase |
| Auth | Supabase Auth | Supabase |

Next.js API routes handle lightweight request validation and Supabase queries. Supabase Edge Functions handle the CPU/IO-heavy operations: pdf-parse text extraction and OpenAI API calls. This split keeps cold-start latency low for UI-facing routes and isolates the AI pipeline from the web server.

### Service Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Next.js SPA)                │
│                                                             │
│  AuthContext → supabase.auth.*                              │
│  Page components → fetch('/api/...')                        │
│  PDF.js ← signed URL from Storage                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                 ┌──────────▼──────────┐
                 │  Next.js API Routes  │
                 │  /api/contracts/*    │
                 │  /api/dashboard      │
                 └────┬────────┬────────┘
                      │        │
          ┌───────────▼───┐  ┌─▼──────────────────────┐
          │  Supabase DB  │  │  Supabase Edge Functions│
          │  (Postgres)   │  │                         │
          │  RLS enforced │  │  extract-text/          │
          └───────────────┘  │  process-contract/      │
                             │  chat/                  │
                             │  submit-feedback/       │
                             └──────────┬──────────────┘
                                        │ HTTPS
                             ┌──────────▼──────────┐
                             │     OpenAI API       │
                             │  GPT-4o JSON mode    │
                             └─────────────────────┘
```

### Core Edge Functions

#### `extract-text`
- **Trigger:** Called by `/api/contracts/upload` after file validation
- **Input:** PDF binary (from multipart form), `contract_id`, `user_id`
- **Process:**
  1. Run `pdf-parse` on PDF buffer
  2. Segment extracted text by page, prepend `[PAGE N]` markers
  3. Count words in extracted text; if < 100 words, return error `SCANNED_PDF`
  4. Upload PDF binary to Supabase Storage at `contracts/{user_id}/{contract_id}/{filename}.pdf` (non-blocking; failure only sets `file_path = null`)
  5. `UPDATE contracts SET contract_text = ..., page_count = ..., file_path = ..., status = 'processing'`
- **Output:** `{ contract_id, page_count, status }`

#### `process-contract`
- **Trigger:** Called by `/api/contracts/[id]/process`
- **Input:** `contract_id`, `user_id`, `custom_terms[]`
- **Process:**
  1. `SELECT contract_text, type FROM contracts WHERE id = contract_id AND user_id = user_id`
  2. Build extraction prompt: system prompt with contract-type-specific few-shot examples (3 NDA or 3 MSA) + standard term list + custom terms appended
  3. Call OpenAI GPT-4o: `{ response_format: { type: "json_object" }, temperature: 0.1, max_tokens: 2000 }`
  4. Parse JSON response; validate schema (`term_name`, `value`, `page_number`, `confidence_score`, `source_sentence`)
  5. If JSON parse fails: retry once with "Return only the JSON array, no explanation."
  6. `INSERT INTO key_terms` (bulk insert all terms; `is_custom = true` for user-added terms)
  7. `UPDATE contracts SET status = 'complete'`
  8. On OpenAI error after 3 retries: `UPDATE contracts SET status = 'error'`; return error to caller
- **Output:** `{ terms_count, contract_id }`

#### `chat`
- **Trigger:** Called by `/api/contracts/[id]/chat` (POST)
- **Input:** `contract_id`, `user_id`, `user_message`
- **Process:**
  1. `SELECT contract_text FROM contracts WHERE id = contract_id AND user_id = user_id`
  2. `SELECT id, role, content FROM chat_messages WHERE session_id = (SELECT id FROM chat_sessions WHERE contract_id = contract_id AND user_id = user_id) ORDER BY created_at ASC` (up to 200 messages)
  3. If no session exists, `INSERT INTO chat_sessions`
  4. `INSERT INTO chat_messages (role='user', content=user_message)`
  5. Classify query: if question references prior chat → `history` context; if about contract → `contract` context; default → `both`
  6. Build prompt: system message (document-only instructions + `[Page X]` requirement) + contract_text as user-role context block + full message history
  7. Call GPT-4o: `{ temperature: 0.4, max_tokens: 1000 }`
  8. `INSERT INTO chat_messages (role='assistant', content=response)`
  9. Return response
- **Output:** `{ message_id, content, session_id }`

#### `submit-feedback`
- **Trigger:** Called by `/api/contracts/[id]/feedback` (POST)
- **Input:** `contract_id`, `user_id`, `rating` (`up`|`down`), `comment?`
- **Process:** `INSERT INTO user_feedback`
- **Output:** `{ feedback_id }`

### Error Handling Strategy

| Error Type | Behaviour |
|---|---|
| OpenAI API error (5xx / network) | Retry 3× with exponential backoff (1s, 2s, 4s); on final failure: `contract.status = 'error'`; return `{ error: "Analysis failed. Please try again in a few minutes." }` |
| OpenAI JSON parse failure | Single retry with corrective prompt; if still fails, treat as API error |
| Supabase DB error | Surface 500 with human-readable message; log error details server-side; no partial writes |
| Supabase Storage failure on upload | Set `file_path = null`; AI pipeline continues using `contract_text`; PDF viewer hidden, text viewer fallback shown |
| PDF validation failure | Return 400 with specific message (size / page count / scanned) before any DB write |
| Auth error | Return 401; client redirects to `/login` |
| Rate limit (OpenAI 429) | Treated as retriable error; same 3× backoff |

### Security Architecture

- OpenAI API key stored in Vercel/Supabase environment variables; never exposed to client bundle
- All AI calls made exclusively from server-side functions
- Supabase RLS enforces `auth.uid() = user_id` on every table — no application-level auth middleware needed, but pre-launch security review required
- Signed Storage URLs issued with 1-hour expiry — PDF viewers request a fresh URL on every results page load
- No contract content sent to any service other than Supabase (storage + DB) and OpenAI (inference)
- OpenAI API called with `user` parameter set to a hashed `user_id` (for abuse detection); `training = false` configured

---

## 7. Database Design and Schema

### Overview

Single Supabase project. All tables use `uuid` primary keys generated by `gen_random_uuid()`. Timestamps are `timestamptz` with `DEFAULT now()`. Row-Level Security is enabled on every table.

The complete schema (including Supabase Storage bucket creation and all RLS policies) is expressed as a single paste-and-run SQL file at `docs/specs/supabase-schema.sql`.

---

### Table: `contracts`

**Purpose:** Master record for each uploaded contract. Stores extracted text so the AI pipeline never needs to re-download the PDF.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `user_id` | `uuid` | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | |
| `name` | `text` | NOT NULL | Original filename (sanitised) |
| `type` | `text` | NOT NULL, CHECK IN ('NDA','MSA') | Selected by user at upload |
| `contract_text` | `text` | NOT NULL | Full extracted text with `[PAGE N]` markers |
| `file_path` | `text` | NULLABLE | Supabase Storage path; null if Storage upload failed |
| `status` | `text` | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','processing','complete','error') | |
| `page_count` | `int` | NOT NULL | Extracted from pdf-parse |
| `token_count` | `int` | NULLABLE | Approximate token count; populated at extraction |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `last_accessed_at` | `timestamptz` | NOT NULL, DEFAULT now() | Updated on every results page load; used for 90-day retention policy |

**Indexes:** `contracts_user_id_idx ON contracts(user_id)`, `contracts_created_at_idx ON contracts(created_at DESC)`

**RLS Policies:**
```sql
-- SELECT: user sees only their own contracts
CREATE POLICY "contracts_select" ON contracts FOR SELECT USING (auth.uid() = user_id);
-- INSERT: user inserts only for themselves
CREATE POLICY "contracts_insert" ON contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE: user updates only their own contracts
CREATE POLICY "contracts_update" ON contracts FOR UPDATE USING (auth.uid() = user_id);
-- DELETE: user deletes only their own contracts (cascades to all related tables)
CREATE POLICY "contracts_delete" ON contracts FOR DELETE USING (auth.uid() = user_id);
```

---

### Table: `key_terms`

**Purpose:** Stores each extracted key term (standard and custom) for a contract.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `contract_id` | `uuid` | NOT NULL, FK → contracts(id) ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | Denormalized for RLS simplicity |
| `term_name` | `text` | NOT NULL | e.g. "Governing Law", "Liability Cap" |
| `value` | `text` | NOT NULL | Extracted value (may be user-edited) |
| `page_number` | `int` | NOT NULL | 1-indexed page number |
| `confidence_score` | `float` | NOT NULL, CHECK BETWEEN 0 AND 1 | Model-reported confidence (0.0–1.0) |
| `source_sentence` | `text` | NOT NULL | Verbatim sentence from contract used to extract value |
| `is_custom` | `bool` | NOT NULL, DEFAULT false | True for user-defined custom terms |
| `original_ai_value` | `text` | NULLABLE | Populated when user edits a term; stores AI's original extraction |
| `is_edited` | `bool` | NOT NULL, DEFAULT false | True after user makes an inline correction |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `key_terms_contract_id_idx ON key_terms(contract_id)`

**RLS Policies:** Same pattern as `contracts` — SELECT/INSERT/UPDATE/DELETE all enforce `auth.uid() = user_id`.

---

### Table: `chat_sessions`

**Purpose:** One session per contract per user. Groups all chat messages for a contract.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `contract_id` | `uuid` | NOT NULL, FK → contracts(id) ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Unique constraint:** `UNIQUE(contract_id, user_id)` — one session per contract per user.

**Indexes:** `chat_sessions_contract_id_idx ON chat_sessions(contract_id)`

**RLS Policies:** SELECT/INSERT enforce `auth.uid() = user_id`.

---

### Table: `chat_messages`

**Purpose:** Individual messages in a contract chat session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `session_id` | `uuid` | NOT NULL, FK → chat_sessions(id) ON DELETE CASCADE | |
| `role` | `text` | NOT NULL, CHECK IN ('user','assistant') | |
| `content` | `text` | NOT NULL | Full message content; AI responses include `[Page X]` citations |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Ascending order = conversation order |

**Indexes:** `chat_messages_session_id_idx ON chat_messages(session_id)`, `chat_messages_created_at_idx ON chat_messages(created_at ASC)`

**RLS Policies:** SELECT/INSERT via session ownership (join to chat_sessions where user_id = auth.uid()). Implemented as a security-definer function or view to avoid exposing session_id in policy.

---

### Table: `user_feedback`

**Purpose:** Thumbs-up / thumbs-down feedback per contract review with optional comment.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `contract_id` | `uuid` | NOT NULL, FK → contracts(id) ON DELETE CASCADE | |
| `user_id` | `uuid` | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | |
| `rating` | `text` | NOT NULL, CHECK IN ('up','down') | |
| `comment` | `text` | NULLABLE | Optional free-text comment |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Unique constraint:** `UNIQUE(contract_id, user_id)` — one feedback per contract per user.

**RLS Policies:** SELECT/INSERT/UPDATE enforce `auth.uid() = user_id`.

---

### Supabase Storage

**Bucket:** `contracts` (private; not public)

**File path pattern:** `contracts/{user_id}/{contract_id}/{filename}.pdf`

**Bucket creation (must be in SQL file):**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;
```

**Storage RLS Policies (must be in SQL file):**
```sql
-- INSERT: user can upload only to their own folder
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- SELECT: user can read only their own files (for signed URL generation)
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: user can delete only their own files
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Signed URLs:** Generated server-side with 1-hour expiry using `supabase.storage.from('contracts').createSignedUrl(path, 3600)`. Requested fresh on every `/results/[contractId]` page load.

---

### Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    ├─── contracts (user_id FK)
    │        │
    │        ├─── key_terms (contract_id FK, user_id FK)
    │        │
    │        ├─── chat_sessions (contract_id FK, user_id FK)
    │        │        │
    │        │        └─── chat_messages (session_id FK)
    │        │
    │        └─── user_feedback (contract_id FK, user_id FK)
    │
    └─── [Storage] contracts/{user_id}/{contract_id}/*.pdf
```

---

## 8. AI Architecture

### Model Configuration

| Parameter | Extraction | Chat |
|---|---|---|
| Model | `gpt-4o` | `gpt-4o` |
| Temperature | 0.1 | 0.4 |
| `response_format` | `{ type: "json_object" }` | Default (text) |
| `max_tokens` | 2,000 | 1,000 |
| Context window | 128,000 tokens | 128,000 tokens |
| Input token budget | ≤ 15,000 (contract) + ~2,000 (prompt) | ≤ 15,000 (contract) + ~4,000 (history + system) |

### Extraction Prompt Strategy

**Technique:** Few-shot prompting. The system prompt contains:
1. Role instruction: "You are a contract analysis expert extracting key terms from legal contracts."
2. Output schema definition with field descriptions
3. 3 labelled NDA examples (term → value, page, confidence, source sentence)
4. 3 labelled MSA examples
5. Standard term list for the selected contract type (10 NDA terms / 12 MSA terms)
6. Custom terms appended: "Additionally, extract the following terms if present: [user-defined terms]"

**Standard NDA Terms:** Parties, Effective Date, Confidentiality Obligations, Permitted Disclosures, Term & Duration, Governing Law, Jurisdiction, IP Ownership, Non-Solicitation, Breach & Remedy

**Standard MSA Terms:** Parties, Service Scope, Payment Terms, Invoice Schedule, Late Payment Penalty, Liability Cap, Indemnification, IP Ownership, Termination Clause, Governing Law, Dispute Resolution, Notice Period

**Output schema:**
```json
{
  "terms": [
    {
      "term_name": "string",
      "value": "string",
      "page_number": 1,
      "confidence_score": 0.92,
      "source_sentence": "string — verbatim sentence from contract"
    }
  ]
}
```

**JSON parse failure recovery:** If the response is not valid JSON, a single retry is sent: "Your previous response was not valid JSON. Return only the JSON object `{ \"terms\": [...] }`, no explanation."

**Confidence scoring:** Embedded in the extraction prompt. Model self-reports a 0.0–1.0 confidence alongside each term. No second inference call. Displayed to user as a percentage (multiply by 100).

### Chat Prompt Strategy

**Technique:** Full-context retrieval (entire contract text passed on every turn) + full conversation history (up to 200 messages, ascending by `created_at`).

**System prompt (enforced on every chat turn):**
```
You are a contract review assistant for ContractIQ.
Answer questions strictly based on the contract document provided below.
If the answer is not in the document, respond: "I cannot find this in the document."
Begin every response with "Based on the document, ..."
Every response must include a page citation in the format [Page X].
Do not use your general legal knowledge to supplement answers.
```

**Context block (injected as a user-role message before history):**
```
[CONTRACT DOCUMENT]
{contract_text}
[END CONTRACT DOCUMENT]
```

**Query classification:** Before building the prompt, a lightweight string check determines whether the question references the conversation history (`"earlier"`, `"before"`, `"you said"`) or the contract. This adjusts whether the full contract text is prepended. No extra API call required.

### Cost Controls

| Control | Detail |
|---|---|
| Input token cap | Reject contracts > 15,000 tokens before sending to OpenAI |
| Max output tokens | 2,000 extraction / 1,000 chat — hard cap in API call |
| Cost monitoring | OpenAI usage dashboard; alert at 80% of monthly budget |
| Fallback model | Claude 3.5 Haiku or Gemini 1.5 Flash evaluated if GPT-4o cost doubles |
| Per-analysis cost target | ≤ $0.20 extraction + ≤ $0.05 chat overhead = ≤ $0.25 total |

### Hallucination Guardrails

**Extraction layer:**
- Confidence < 50% → ⚠️ icon + amber/red badge + non-dismissible tooltip: "Low confidence — we recommend verifying this in the document directly."
- Terms are never hidden, regardless of confidence score
- Source sentence required for every term; terms missing source sentences are flagged internally as unreliable
- Temperature 0.1 + JSON mode minimise fabrication
- Monthly calibration evaluation: if predicted confidence is ≥ 15% miscalibrated vs. observed accuracy, show calibration warning in UI

**Chat layer:**
- System prompt forbids use of general legal knowledge
- "I cannot find this in the document" is the correct, expected response when information is absent
- Mandatory `[Page X]` citation on every response
- "Based on the document..." prefix on every response
- Automated regression test: feed a question about a topic absent from the document; assert response contains "I cannot find this"

**UI layer:**
- "This is an AI-assisted review tool, not legal advice. Always verify critical terms with a qualified lawyer." — present on every results page, not dismissible
- Inline correction available for every term; original AI value stored for feedback loop
- PDF auto-scrolls to cited page when user clicks a page reference

### AI Performance Monitoring

| Check | Method | Cadence |
|---|---|---|
| Extraction F1 accuracy | Offline eval suite: 30 NDA + 20 MSA labelled contracts from CUAD + SME annotations | Every release |
| Confidence calibration | Calibration curve (predicted vs. observed per 10% bucket) | Monthly |
| Page attribution accuracy | % terms with correct page number vs. ground truth | Every release |
| Chat groundedness | Expert review: 50 Q&A pairs; score Grounded / Hallucinated / Not Found | Monthly |
| Production correction rate | Alert if > 12% of terms corrected in any 7-day window | Continuous (weekly check) |

---

## 9. API Specification

All routes require `Authorization: Bearer <supabase_jwt>` unless noted. All responses are `Content-Type: application/json`. Supabase Auth JWT is validated server-side using the Supabase Admin client.

---

### `POST /api/contracts/upload`

**Purpose:** Validate and upload a PDF; extract text; create the contract record.

**Auth required:** Yes

**Request:** `multipart/form-data`
| Field | Type | Required | Validation |
|---|---|---|---|
| `file` | binary (PDF) | Yes | `.pdf` extension; ≤ 10 MB; ≤ 20 pages (validated after parse) |
| `contractType` | `string` | Yes | `"NDA"` or `"MSA"` |
| `contractName` | `string` | No | Defaults to sanitised filename if omitted |

**Process:**
1. Validate file type, size (≤ 10 MB)
2. Call `extract-text` Edge Function
3. Validate: page count ≤ 20, word count ≥ 100, token count ≤ 15,000
4. Return `contract_id` to client; client polls or proceeds to `/process`

**Response `201`:**
```json
{
  "contractId": "uuid",
  "pageCount": 14,
  "status": "processing"
}
```

**Error responses:**
| Code | Condition |
|---|---|
| 400 | File too large: `"File exceeds 10 MB limit."` |
| 400 | Too many pages: `"Document exceeds 20 pages."` |
| 400 | Scanned PDF: `"Scanned PDFs are not supported yet."` |
| 400 | Contract too long: `"This contract is too long for analysis. Support for longer contracts is coming soon."` |
| 400 | Invalid file type: `"Please upload a PDF file."` |
| 401 | Unauthenticated |
| 500 | Internal error with human-readable message |

---

### `POST /api/contracts/[id]/process`

**Purpose:** Trigger GPT-4o key term extraction for an uploaded contract.

**Auth required:** Yes (must own contract)

**Request body `application/json`:**
```json
{
  "customTerms": ["Non-compete radius", "Auto-renewal clause"]
}
```

**Process:** Calls `process-contract` Edge Function. Returns immediately with `202 Accepted`; client polls `GET /api/contracts/[id]` for status change to `complete` or `error`.

**Response `202`:**
```json
{
  "contractId": "uuid",
  "status": "processing"
}
```

**Error responses:**
| Code | Condition |
|---|---|
| 400 | More than 5 custom terms: `"Maximum 5 custom terms allowed."` |
| 400 | Contract not in `processing` status |
| 401 | Unauthenticated |
| 403 | Contract belongs to another user |
| 500 | OpenAI error (after retries) with human-readable message |

---

### `GET /api/contracts/[id]`

**Purpose:** Fetch a contract with all its extracted key terms and a signed PDF URL.

**Auth required:** Yes (must own contract)

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Acme_NDA_2026.pdf",
  "type": "NDA",
  "status": "complete",
  "pageCount": 14,
  "createdAt": "2026-07-16T10:30:00Z",
  "signedUrl": "https://supabase.../...",
  "keyTerms": [
    {
      "id": "uuid",
      "termName": "Governing Law",
      "value": "State of Delaware",
      "pageNumber": 8,
      "confidenceScore": 0.94,
      "sourceSentence": "This Agreement shall be governed by the laws of the State of Delaware.",
      "isCustom": false,
      "isEdited": false,
      "originalAiValue": null
    }
  ]
}
```

**Notes:** `signedUrl` is `null` if `file_path` is null (Storage unavailable at upload). Client shows text viewer fallback in this case.

**Error responses:** 401, 403, 404

---

### `PATCH /api/contracts/[id]/terms/[termId]`

**Purpose:** Save a user's inline correction to an extracted term.

**Auth required:** Yes (must own contract)

**Request body `application/json`:**
```json
{
  "value": "Corrected value by user"
}
```

**Process:** Sets `value = corrected_value`, `original_ai_value = current value` (if not already edited), `is_edited = true`. Returns within 2 seconds.

**Response `200`:**
```json
{
  "id": "uuid",
  "value": "Corrected value by user",
  "isEdited": true,
  "originalAiValue": "State of Delware"
}
```

**Error responses:** 400 (empty value), 401, 403, 404

---

### `POST /api/contracts/[id]/chat`

**Purpose:** Send a user message and receive a GPT-4o response grounded in the contract.

**Auth required:** Yes (must own contract)

**Request body `application/json`:**
```json
{
  "message": "What happens if I breach the NDA?"
}
```

**Response `200`:**
```json
{
  "messageId": "uuid",
  "sessionId": "uuid",
  "role": "assistant",
  "content": "Based on the document, if you breach the NDA, the non-disclosing party is entitled to seek injunctive relief and monetary damages without the need to post bond. [Page 6]",
  "createdAt": "2026-07-16T10:35:00Z"
}
```

**Error responses:**
| Code | Condition |
|---|---|
| 400 | Empty message |
| 401 | Unauthenticated |
| 403 | Contract belongs to another user |
| 404 | Contract not found |
| 408 | OpenAI timeout: `"Response timed out. Please try again."` |
| 500 | OpenAI error after retries |

---

### `GET /api/contracts/[id]/chat`

**Purpose:** Fetch all chat messages for a contract session.

**Auth required:** Yes (must own contract)

**Response `200`:**
```json
{
  "sessionId": "uuid",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What happens if I breach the NDA?",
      "createdAt": "2026-07-16T10:35:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Based on the document... [Page 6]",
      "createdAt": "2026-07-16T10:35:03Z"
    }
  ]
}
```

**Notes:** Returns empty `messages: []` if no chat session exists yet. Messages sorted ascending by `created_at`.

---

### `POST /api/contracts/[id]/feedback`

**Purpose:** Submit a thumbs-up/down rating with optional comment.

**Auth required:** Yes (must own contract)

**Request body `application/json`:**
```json
{
  "rating": "up",
  "comment": "Found the governing law section immediately."
}
```

**Response `201`:**
```json
{
  "feedbackId": "uuid"
}
```

**Error responses:** 400 (invalid rating), 401, 403, 409 (feedback already submitted for this contract)

---

### `GET /api/dashboard`

**Purpose:** Fetch the authenticated user's contract list with summary stats.

**Auth required:** Yes

**Query params:** `sort` (`date_desc`|`date_asc`|`name_asc`|`type`) — default `date_desc`

**Response `200`:**
```json
{
  "stats": {
    "total": 12,
    "byType": { "NDA": 8, "MSA": 4 }
  },
  "contracts": [
    {
      "id": "uuid",
      "name": "Acme_NDA_2026.pdf",
      "type": "NDA",
      "status": "complete",
      "pageCount": 14,
      "createdAt": "2026-07-16T10:30:00Z"
    }
  ]
}
```

---

## 10. Feature Breakdown

### Phase 1 — MVP (Weeks 1–11, v0.1–v0.4)

#### Foundation (v0.1, Weeks 1–2)
| Feature | Description | Acceptance Criteria | Dependencies |
|---|---|---|---|
| Supabase project setup | All DB tables, indexes, RLS policies, Storage bucket via single SQL file | SQL runs without error in Supabase SQL Editor; RLS cross-user test passes | Supabase project created |
| Landing page | Static marketing page with value prop, demo GIF, Sign In / Get Started CTAs | Page renders; CTAs navigate to auth; no dynamic data fetched | None |
| Email/password auth | Sign up, sign in, sign out via Supabase Auth | Auth completes within 10 s; session persists on reload; invalid creds show clear error | Supabase Auth enabled |
| Dashboard empty state | Redirect to dashboard on login; empty state message | Authenticated users reach dashboard; "No contracts yet" shown with 0 contracts | Auth |

#### Core Review Flow (v0.2, Weeks 3–5)
| Feature | Description | Acceptance Criteria | Dependencies |
|---|---|---|---|
| PDF upload screen | Contract type selector + drag-and-drop upload + file validation | File validates ≤ 10 MB / ≤ 20 pages; error messages clear; contract row created in DB | Supabase DB, extract-text function |
| PDF text extraction | pdf-parse via Edge Function; `[PAGE N]` markers; scanned PDF detection | Text stored in `contract_text`; page markers present; scanned PDFs rejected with clear message | Supabase Edge Functions, pdf-parse |
| Key term extraction | GPT-4o JSON mode; few-shot; standard NDA/MSA terms | ≥ 10 standard terms extracted per contract; all 5 fields populated per term; completes in ≤ 30 s P95 | OpenAI API, process-contract function |
| Key terms panel | Display term name, value, page number, confidence score | All fields shown; confidence colour-coded; ⚠️ on terms < 50% | Key term extraction |
| Results stored in Supabase | All key terms persisted; status updated to `complete` | Data visible in DB after processing; status transitions correct | Supabase DB |

#### Enriched Experience (v0.3, Weeks 6–8)
| Feature | Description | Acceptance Criteria | Dependencies |
|---|---|---|---|
| Pre-processing preview | Show standard term list before processing begins | Preview renders for NDA and MSA; updates on contract type change | Upload screen |
| Custom term addition | "+ Add Key Term" input; max 5 terms; "Custom" badge | Custom terms appear in preview; included in extraction results with same data structure | Key term extraction |
| Inline PDF viewer | PDF.js; scrollable, zoomable | All pages render; zoom works; lazy loading for large PDFs | Supabase Storage signed URL |
| Text viewer fallback | Parses `[PAGE N]` markers; paginated display; same `targetPage` prop | Renders when `signedUrl` is null; page navigation works identically to PDF viewer | Supabase DB contract_text |
| Page-click navigation | Click page number on key term → PDF viewer scrolls | Smooth scroll; page highlighted; works for both PDF and text viewers | PDF viewer, text viewer fallback |
| Source sentence tooltip | Expandable "Why?" section per term | Shows verbatim source sentence from AI output; expandable/collapsible | Key terms panel |

#### Chat & History (v0.4, Weeks 9–11)
| Feature | Description | Acceptance Criteria | Dependencies |
|---|---|---|---|
| Contract chat interface | Full-contract-context GPT-4o chat; document-only responses | Responds within 15 s; page citations present; "I cannot find this" for off-document questions | OpenAI API, chat function |
| Persistent chat history | Messages stored; reload restores session | Reopening results page shows full previous conversation | Supabase DB, chat_messages table |
| Dashboard with contract history | Sortable list of all contracts | Name, type, date, status shown; clicking row opens results; sort by date/name/type works | Supabase DB, GET /api/dashboard |
| Inline term editing | Click-to-edit any term value | Edit saves within 2 s; "Edited" badge shown; original AI value retained in DB | PATCH /api/contracts/[id]/terms/[termId] |
| Error states | Upload failures, OpenAI timeouts, scanned PDFs | Each error shows a specific, human-readable message; "Try Again" CTA for OpenAI failures | All prior features |

---

### Phase 2 — Launch (Weeks 12–14, v1.0)

| Feature | Description | Acceptance Criteria |
|---|---|---|
| Feedback widget | Thumbs up/down + optional comment per review | Saved to `user_feedback`; one submission per contract per user; 409 on duplicate |
| End-to-end optimisation | P95 latency ≤ 30 s (upload → results); chat ≤ 15 s | Load tested with 50-contract eval set; timing logs confirm targets |
| Security audit | RLS cross-user access test; signed URL expiry validation; API key management review | 0 cross-user data exposure; signed URLs expire correctly; no API keys in client bundle |
| WCAG 2.1 AA review | Colour contrast, keyboard navigation, screen reader labels | Automated axe-core scan passes; manual keyboard-only walkthrough of all flows |
| Rate limiting | OpenAI call rate limiting per user per hour | Excess requests return 429 with "Too many requests. Please try again later." |
| Onboarding tooltips | First-time user: tooltips on key terms panel, chat, confidence badge | Tooltips visible on first visit; dismissible; not shown on subsequent visits |

---

### Phase 3 — Growth (Weeks 15–24, v1.1–v1.2)

| Version | Feature | Description |
|---|---|---|
| v1.1 | Export to CSV | Download all key terms as `.csv`; generates within 5 s |
| v1.1 | Export to PDF | Download formatted review summary as PDF |
| v1.1 | Batch upload | Upload up to 5 contracts simultaneously; status tracked per contract |
| v1.1 | Dashboard analytics | Charts: contracts processed per month, term correction rate over time |
| v1.2 | OCR support | AWS Textract for scanned PDFs; extracted text fed into same pipeline |
| v1.2 | Contract comparison | Side-by-side key term view for 2 contracts |
| v1.2 | Email notifications | Email on processing completion; configurable in account settings |
| v1.2 | Team workspaces | Shared contract library; per-seat pricing; role-based access (admin / viewer) |

---

## 11. Folder Structure

```
LegalAnalysis/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/                       # Auth route group (no shared layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Sign-in page
│   │   │   └── signup/
│   │   │       └── page.tsx              # Sign-up page
│   │   ├── api/                          # API routes (Next.js Route Handlers)
│   │   │   ├── contracts/
│   │   │   │   ├── upload/
│   │   │   │   │   └── route.ts          # POST /api/contracts/upload
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET /api/contracts/[id]
│   │   │   │       ├── process/
│   │   │   │       │   └── route.ts      # POST /api/contracts/[id]/process
│   │   │   │       ├── terms/
│   │   │   │       │   └── [termId]/
│   │   │   │       │       └── route.ts  # PATCH /api/contracts/[id]/terms/[termId]
│   │   │   │       ├── chat/
│   │   │   │       │   └── route.ts      # GET + POST /api/contracts/[id]/chat
│   │   │   │       └── feedback/
│   │   │   │           └── route.ts      # POST /api/contracts/[id]/feedback
│   │   │   └── dashboard/
│   │   │       └── route.ts              # GET /api/dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Dashboard page (protected)
│   │   ├── upload/
│   │   │   └── page.tsx                  # Upload page (protected)
│   │   ├── results/
│   │   │   └── [contractId]/
│   │   │       └── page.tsx              # Results page (protected)
│   │   ├── layout.tsx                    # Root layout: nav, auth provider, disclaimer banner
│   │   └── page.tsx                      # Landing page (public)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthModal.tsx             # Sign-in / Sign-up modal (tabs)
│   │   ├── upload/
│   │   │   ├── PDFUploader.tsx           # Drag-and-drop zone + file validation
│   │   │   ├── ContractTypeSelector.tsx  # NDA / MSA dropdown
│   │   │   ├── KeyTermPreview.tsx        # Pre-processing term list with "Custom" badges
│   │   │   └── CustomTermInput.tsx       # "+ Add Key Term" text field (max 5)
│   │   ├── results/
│   │   │   ├── KeyTermsPanel.tsx         # Scrollable list of TermCards
│   │   │   ├── TermCard.tsx              # Single term: name, value, page, confidence, edit mode
│   │   │   ├── ConfidenceBadge.tsx       # Green/amber/red badge + ⚠️ icon
│   │   │   ├── SourceSentenceTooltip.tsx # Expandable "Why?" section
│   │   │   ├── PDFViewer.tsx             # PDF.js renderer; accepts targetPage prop
│   │   │   └── TextViewerFallback.tsx    # [PAGE N] parser + paginated text display
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx         # Input + message list
│   │   │   └── ChatMessage.tsx           # Single message; role-aligned; [Page X] as clickable link
│   │   ├── dashboard/
│   │   │   ├── DashboardStats.tsx        # Total contracts, NDA/MSA count cards
│   │   │   └── DashboardTable.tsx        # Sortable contract history table
│   │   └── shared/
│   │       ├── FeedbackWidget.tsx        # Thumbs up/down + optional comment
│   │       ├── DisclaimerBanner.tsx      # "Not legal advice" — shown on results pages
│   │       ├── ErrorBanner.tsx           # Generic error display with optional retry CTA
│   │       └── ProcessingProgress.tsx    # 3-step progress indicator during extraction
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # createBrowserClient() — for use in components
│   │   │   └── server.ts                 # createServerClient() — for use in API routes
│   │   ├── openai/
│   │   │   ├── client.ts                 # OpenAI client (server-only; API key from env)
│   │   │   ├── extractionPrompt.ts       # Builds NDA/MSA few-shot extraction prompt
│   │   │   └── chatPrompt.ts             # Builds chat prompt with system message + context
│   │   └── pdf/
│   │       └── extractText.ts            # pdf-parse wrapper: buffer → text with [PAGE N] markers
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                    # Auth state from Supabase; sign in/out helpers
│   │   ├── useContract.ts                # Fetch + poll contract status; key terms
│   │   └── useChat.ts                    # Chat history load; send message; optimistic updates
│   │
│   └── types/
│       └── index.ts                      # Contract, KeyTerm, ChatMessage, UserFeedback types
│
├── supabase/
│   └── functions/
│       ├── extract-text/
│       │   └── index.ts                  # Deno Edge Function: pdf-parse + Storage upload
│       ├── process-contract/
│       │   └── index.ts                  # Deno Edge Function: OpenAI extraction
│       ├── chat/
│       │   └── index.ts                  # Deno Edge Function: OpenAI chat
│       └── submit-feedback/
│           └── index.ts                  # Deno Edge Function: feedback write
│
├── docs/
│   ├── ContractIQ_PRD.md
│   └── engineering/
│       └── engineering-doc.md            # This file
│
├── skills/
│   └── engineering-planner/
│       └── SKILL.md
│
├── .env.example                          # All required environment variables
└── CLAUDE.md                             # Project workflow guide
```

---

## 12. Naming Conventions

### Files and Folders

| Scope | Convention | Example |
|---|---|---|
| React component files | PascalCase, `.tsx` | `KeyTermsPanel.tsx`, `ConfidenceBadge.tsx` |
| Utility / lib files | camelCase, `.ts` | `extractionPrompt.ts`, `extractText.ts` |
| Hook files | `use` prefix, camelCase, `.ts` | `useContract.ts`, `useChat.ts` |
| Next.js App Router pages | `page.tsx` (fixed by Next.js) | `src/app/dashboard/page.tsx` |
| Next.js API route files | `route.ts` (fixed by Next.js) | `src/app/api/contracts/upload/route.ts` |
| Route directories | kebab-case | `results/[contractId]/`, `submit-feedback/` |
| Dynamic route segments | camelCase in brackets | `[contractId]`, `[termId]` |
| Supabase Edge Function directories | kebab-case | `extract-text/`, `process-contract/` |
| Type definition files | camelCase | `index.ts` under `types/` |

### React Components

| Item | Convention | Example |
|---|---|---|
| Component names | PascalCase | `<TermCard />`, `<PDFViewer />` |
| Props interfaces | PascalCase + `Props` suffix | `TermCardProps`, `PDFViewerProps` |
| Event handler props | `on` prefix, camelCase | `onPageChange`, `onTermEdit` |
| Boolean props | adjective or `is`/`has` prefix | `isEdited`, `isCustom`, `hasError` |

### Custom Hooks

| Convention | Example |
|---|---|
| `use` prefix, camelCase | `useAuth`, `useContract`, `useChat` |
| Return object with named properties (not positional array) | `const { contract, keyTerms, isLoading } = useContract(id)` |

### API Routes

| Convention | Example |
|---|---|
| RESTful resource/sub-resource | `/api/contracts/[id]/terms/[termId]` |
| Action sub-routes for non-CRUD | `/api/contracts/[id]/process`, `/api/contracts/[id]/feedback` |
| HTTP verbs follow REST semantics | GET = read, POST = create/action, PATCH = partial update |

### Database

| Scope | Convention | Example |
|---|---|---|
| Table names | snake_case, plural | `contracts`, `key_terms`, `chat_sessions`, `chat_messages`, `user_feedback` |
| Column names | snake_case | `contract_text`, `confidence_score`, `is_edited`, `original_ai_value` |
| Primary keys | `id` (always uuid) | `id uuid PK` |
| Foreign keys | `{table_singular}_id` | `contract_id`, `session_id`, `user_id` |
| Boolean columns | `is_` or `has_` prefix | `is_custom`, `is_edited` |
| Timestamp columns | `_at` suffix | `created_at`, `last_accessed_at` |
| Indexes | `{table}_{column(s)}_idx` | `contracts_user_id_idx` |
| RLS policies | `"{table}_{operation}"` | `"contracts_select"`, `"key_terms_insert"` |

### Environment Variables

| Scope | Convention | Example |
|---|---|---|
| Public (client-accessible) | `NEXT_PUBLIC_` prefix | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Server-only secrets | SCREAMING_SNAKE_CASE | `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Service grouping | `{SERVICE}_` prefix | `OPENAI_`, `SUPABASE_` |

### TypeScript Types

| Item | Convention | Example |
|---|---|---|
| Interfaces | PascalCase | `Contract`, `KeyTerm`, `ChatMessage` |
| Union types | PascalCase | `ContractStatus`, `ContractType`, `UserRole` |
| Enum-like string unions | `type X = 'a' \| 'b'` (not TypeScript enums) | `type ContractStatus = 'pending' \| 'processing' \| 'complete' \| 'error'` |
| API response types | PascalCase + `Response` suffix | `ContractResponse`, `DashboardResponse` |

---

## 13. Testing Strategy

### Unit Tests — Jest + React Testing Library

**Targets:** Pure functions and utility logic in `src/lib/`; individual component rendering and behaviour.

| Test | File | What is verified |
|---|---|---|
| `extractText` page markers | `src/lib/pdf/extractText.test.ts` | `[PAGE N]` markers inserted at correct positions; word count computed correctly; scanned PDF detection (< 100 words) |
| `buildExtractionPrompt` NDA | `src/lib/openai/extractionPrompt.test.ts` | Standard NDA terms present in prompt; custom terms appended; few-shot examples present |
| `buildExtractionPrompt` MSA | `src/lib/openai/extractionPrompt.test.ts` | Standard MSA terms present; term count correct |
| `parseOpenAIExtractionResponse` | `src/lib/openai/extractionPrompt.test.ts` | Valid JSON parsed correctly; invalid JSON returns null for retry logic |
| `ConfidenceBadge` colours | `src/components/results/ConfidenceBadge.test.tsx` | ≥ 0.8 → green; 0.5–0.79 → amber; < 0.5 → red + ⚠️ icon |
| `TermCard` edit mode | `src/components/results/TermCard.test.tsx` | Edit input appears on click; save triggers PATCH call; "Edited" badge shown on save |
| `TextViewerFallback` page parsing | `src/components/results/TextViewerFallback.test.tsx` | `[PAGE 1]...[PAGE 2]` correctly segmented; `targetPage` prop scrolls to correct section |
| `ChatMessage` citation link | `src/components/chat/ChatMessage.test.tsx` | `[Page 6]` in content renders as clickable link; click triggers `onPageSelect(6)` |

**Coverage target:** 80% line coverage on all files in `src/lib/`.

---

### Integration Tests — Jest + Supabase Test Client

**Targets:** API route handlers tested against a Supabase test project (or local Supabase with test seed data).

| Test | What is verified |
|---|---|
| `POST /api/contracts/upload` — valid PDF | Contract row created; `contract_text` populated; status = `processing`; 201 returned |
| `POST /api/contracts/upload` — file too large | 400 returned with correct message; no DB row created |
| `POST /api/contracts/upload` — scanned PDF | 400 returned with "Scanned PDFs are not supported yet"; no DB row |
| `POST /api/contracts/[id]/process` — success | `key_terms` rows inserted; `status = 'complete'`; 202 returned |
| `POST /api/contracts/[id]/process` — OpenAI failure | After 3 retries: `status = 'error'`; 500 with human-readable message |
| `PATCH /api/contracts/[id]/terms/[termId]` — valid edit | `value` updated; `is_edited = true`; `original_ai_value` set; 200 returned within 2 s |
| `POST /api/contracts/[id]/chat` — on-document question | Assistant message saved; `[Page X]` present in response; 200 returned |
| `GET /api/contracts/[id]` — cross-user access | 403 returned; no data exposed |
| RLS: SELECT `contracts` as another user | 0 rows returned (not the other user's contract) |
| RLS: INSERT `key_terms` with wrong `user_id` | Insert rejected by RLS |

---

### End-to-End Tests — Playwright

**Targets:** Full user journeys through the browser.

| Flow | Steps | Assertions |
|---|---|---|
| Sign-up and land on dashboard | Load `/`, click "Get Started", fill form, submit | Dashboard loads; empty state visible |
| Upload and process NDA | Sign in, go to `/upload`, select NDA, upload test PDF, add 1 custom term, click "Process" | Progress shows 3 steps; results page loads; ≥ 10 key terms visible |
| Page-click navigation | On results page, click page number on any term | PDF viewer (or text fallback) scrolls to that page |
| Inline term edit | Click edit on first term, type new value, save | "Edited" badge appears; original value retained (verify via GET API) |
| Chat — on-document question | Open chat, type "What is the governing law?", submit | Response contains "Based on the document" and `[Page X]`; no timeout |
| Chat — hallucination regression | Open chat, type "What is the plaintiff's favourite colour?" | Response contains "I cannot find this in the document" |
| Dashboard history | Process 2 contracts; go to `/dashboard` | Both contracts listed; sortable; clicking row opens results |
| Feedback submission | On results page, click thumbs up, add comment, submit | 201 returned; second submission shows 409 |
| Auth guard | Access `/dashboard` without session | Redirected to `/login` |

---

### Offline Evaluation Suite (not in CI — run manually per release)

| Eval | Method | Target |
|---|---|---|
| NDA extraction F1 | 30 manually labelled NDA contracts (CUAD + SME annotations); compare extracted vs. ground truth per term | ≥ 88% F1 |
| MSA extraction F1 | 20 manually labelled MSA contracts | ≥ 85% F1 |
| Page attribution accuracy | % of extracted terms where `page_number` matches ground truth | ≥ 92% |
| Custom term extraction F1 | 10 predefined custom terms injected into 15 test contracts | ≥ 80% F1 |
| Confidence calibration | Calibration curve: predicted confidence vs. observed accuracy (10% buckets) | Calibration error ≤ 0.10 |
| Chat groundedness | 50 Q&A pairs from real contracts; expert-scored Grounded / Hallucinated / Not Found | ≤ 5% Hallucinated |
| End-to-end latency | P95 timing: upload submission → key terms panel rendered | ≤ 30 seconds |

---

## 14. Specs-to-Implementation Mapping

### US-001 — User Authentication

| Spec Element | Implementation |
|---|---|
| Supabase Auth (sign up / sign in / sign out) | `src/lib/supabase/client.ts` — `createBrowserClient()`; `src/hooks/useAuth.ts` — `signIn`, `signOut`, `signUp` helpers |
| Auth modal (sign-up + sign-in tabs) | `src/components/auth/AuthModal.tsx` |
| Sign-up page | `src/app/(auth)/signup/page.tsx` |
| Sign-in page | `src/app/(auth)/login/page.tsx` |
| Session persistence + redirect to dashboard | `src/app/layout.tsx` — `supabase.auth.onAuthStateChange` listener |
| Auth guard on protected routes | `src/app/dashboard/page.tsx`, `src/app/upload/page.tsx`, `src/app/results/[contractId]/page.tsx` — check session; redirect to `/login` if absent |
| FR-01 (auth requirement), FR-13 (session tokens in browser) | All above files |

**Flow:** User submits credentials → `supabase.auth.signInWithPassword()` in `useAuth.ts` → session token stored in browser cookie by Supabase → `onAuthStateChange` updates context → protected pages read session from context

---

### US-002 — PDF Upload + Text Extraction

| Spec Element | Implementation |
|---|---|
| Upload screen (contract type selector + drag-and-drop) | `src/app/upload/page.tsx`, `src/components/upload/PDFUploader.tsx`, `src/components/upload/ContractTypeSelector.tsx` |
| Client-side file validation (size, type, page count pre-check) | `src/components/upload/PDFUploader.tsx` — validate before POST |
| POST /api/contracts/upload | `src/app/api/contracts/upload/route.ts` |
| pdf-parse text extraction with [PAGE N] markers | `src/lib/pdf/extractText.ts` (imported by extract-text Edge Function) |
| Supabase Edge Function: extract-text | `supabase/functions/extract-text/index.ts` |
| Storage upload (non-blocking) | Inside `extract-text/index.ts` — Storage failure does not abort pipeline |
| FR-02 (file limits), FR-03 (contract_text stored once) | `route.ts` validation + `extract-text/index.ts` |

**Flow:** User drops PDF → client validates format/size → `POST /api/contracts/upload` → `extract-text` function → pdf-parse extracts text with page markers → Storage upload attempted (non-blocking) → `contracts` row updated with `contract_text`, `page_count`, `status = 'processing'` → `contract_id` returned to client

---

### US-003 — Page Number Attribution

| Spec Element | Implementation |
|---|---|
| `page_number` field in extraction output schema | `src/lib/openai/extractionPrompt.ts` — schema definition in prompt |
| Display page number per term; click → scroll to page | `src/components/results/TermCard.tsx` — page number as clickable element |
| PDFViewer scroll-to-page on click | `src/components/results/PDFViewer.tsx` — `targetPage` prop; PDF.js `pdfViewer.currentPageNumber = targetPage` |
| TextViewerFallback scroll-to-section | `src/components/results/TextViewerFallback.tsx` — same `targetPage` prop; scrolls to matching `[PAGE N]` section |
| FR-07 (smooth scroll + highlight) | Both viewer components |

---

### US-004 — Confidence Score Display

| Spec Element | Implementation |
|---|---|
| `confidence_score` embedded in extraction prompt | `src/lib/openai/extractionPrompt.ts` — field in required JSON schema |
| Confidence colour coding (green/amber/red) + ⚠️ | `src/components/results/ConfidenceBadge.tsx` |
| Warning tooltip for terms < 50% | `src/components/results/TermCard.tsx` — conditional tooltip on ConfidenceBadge |
| FR-04 (confidence display), FR-11 (< 50% warning) | `TermCard.tsx`, `ConfidenceBadge.tsx` |

---

### US-005 — Custom Key Term Addition

| Spec Element | Implementation |
|---|---|
| "+ Add Key Term" input (max 5) | `src/components/upload/CustomTermInput.tsx` |
| "Custom" badge in pre-processing preview | `src/components/upload/KeyTermPreview.tsx` |
| Custom terms appended to extraction prompt | `src/lib/openai/extractionPrompt.ts` — `customTerms` parameter |
| `is_custom = true` in DB for user-defined terms | `supabase/functions/process-contract/index.ts` — set flag on insert |
| FR-05 (custom terms, max 5, same data structure) | `CustomTermInput.tsx`, `extractionPrompt.ts`, `process-contract/index.ts` |

---

### US-006 — Inline PDF Viewer

| Spec Element | Implementation |
|---|---|
| PDF.js rendering with signed URL | `src/components/results/PDFViewer.tsx` |
| Signed URL from Storage (1-hour expiry) | `GET /api/contracts/[id]` route — `supabase.storage.from('contracts').createSignedUrl(path, 3600)` |
| Text viewer fallback when `signedUrl = null` | `src/components/results/TextViewerFallback.tsx` |
| Both viewers respond to `targetPage` prop | Both viewer components |
| FR-06 (always show content; fallback for Storage unavailability) | `src/app/results/[contractId]/page.tsx` — conditional render of PDFViewer vs. TextViewerFallback |

---

### US-007 — Chat with Contract

| Spec Element | Implementation |
|---|---|
| Chat UI (user right-aligned, AI left-aligned) | `src/components/chat/ChatInterface.tsx`, `src/components/chat/ChatMessage.tsx` |
| POST /api/contracts/[id]/chat | `src/app/api/contracts/[id]/chat/route.ts` |
| Supabase Edge Function: chat | `supabase/functions/chat/index.ts` |
| Chat prompt builder (system prompt + contract text + history) | `src/lib/openai/chatPrompt.ts` |
| [Page X] citation as clickable link → PDFViewer scroll | `src/components/chat/ChatMessage.tsx` — parse `[Page X]` pattern; render as button; call `onPageSelect(X)` |
| FR-08 (grounded chat), FR-09 (messages saved) | `chat/index.ts`, `ChatInterface.tsx` |

---

### US-008 — Dashboard with Contract History

| Spec Element | Implementation |
|---|---|
| Dashboard stats (total, by type) | `src/components/dashboard/DashboardStats.tsx` |
| Sortable contract table | `src/components/dashboard/DashboardTable.tsx` |
| GET /api/dashboard | `src/app/api/dashboard/route.ts` |
| Clicking row opens results | `DashboardTable.tsx` — `router.push('/results/[contractId]')` |
| FR-10 (dashboard requirements) | Both dashboard components |

---

### US-009 — Inline Key Term Editing

| Spec Element | Implementation |
|---|---|
| Click-to-edit on any term | `src/components/results/TermCard.tsx` — local `isEditing` state; inline `<input>` |
| PATCH /api/contracts/[id]/terms/[termId] | `src/app/api/contracts/[id]/terms/[termId]/route.ts` |
| "Edited" badge; original AI value retained | `TermCard.tsx` reads `isEdited` and `originalAiValue` from props |
| Save within 2 seconds | API route validation + Supabase single-row UPDATE |

---

### US-010 — Feedback Submission

| Spec Element | Implementation |
|---|---|
| Thumbs up/down + comment widget | `src/components/shared/FeedbackWidget.tsx` |
| POST /api/contracts/[id]/feedback | `src/app/api/contracts/[id]/feedback/route.ts` |
| Supabase Edge Function: submit-feedback | `supabase/functions/submit-feedback/index.ts` |
| One feedback per contract per user | DB unique constraint `UNIQUE(contract_id, user_id)`; 409 on duplicate |
| FR-12 (feedback to user_feedback table) | `FeedbackWidget.tsx`, `submit-feedback/index.ts` |

---

### US-012 — Persistent Chat History

| Spec Element | Implementation |
|---|---|
| Chat session creation on first message | `supabase/functions/chat/index.ts` — `INSERT INTO chat_sessions` if none exists |
| Load history on results page open | `src/hooks/useChat.ts` — `GET /api/contracts/[id]/chat` on mount |
| Messages persisted in order | `chat_messages.created_at` ascending index; loaded in order |
| FR-09 (messages saved in real-time) | `chat/index.ts` inserts both user and assistant messages before returning |

---

### FR-13 — Row-Level Security (All Tables)

| Spec Element | Implementation |
|---|---|
| RLS policies on all tables | `docs/specs/supabase-schema.sql` — all CREATE POLICY statements |
| Cross-user isolation | Integration test: request another user's contract → 403 / 0 rows |
| Pre-launch security audit | Manual cross-user access test from 2 test accounts before v1.0 |

---

### FR-14 — Single Paste-and-Run SQL File

| Spec Element | Implementation |
|---|---|
| All tables, indexes, triggers, RLS policies | `docs/specs/supabase-schema.sql` |
| Storage bucket creation | `INSERT INTO storage.buckets` in SQL file |
| Storage RLS policies | `CREATE POLICY ON storage.objects` (INSERT, SELECT, DELETE) in SQL file |
| File path pattern enforced in policy | `(storage.foldername(name))[1] = auth.uid()::text` |

---

*This document is the authoritative engineering reference for ContractIQ. No implementation begins until this document is approved. Questions and clarifications should be resolved by updating this document before Stage 2 (Implementation Specs) begins.*

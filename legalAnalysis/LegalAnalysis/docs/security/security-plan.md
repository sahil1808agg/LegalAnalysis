# ContractIQ — Security Plan

Generated: 2026-07-17

---

## Security Issues Found and Fixed

| # | Issue | Severity | File(s) | Fix Applied |
|---|-------|----------|---------|-------------|
| 1 | No `middleware.ts` — protected pages accessible without auth | Critical | — | Created `middleware.ts` with route protection |
| 2 | Edge functions accept `user_id` from request body — no JWT verification; service role bypasses RLS entirely | Critical | `supabase/functions/*/index.ts` | Added JWT verification via `supabase.auth.getUser(token)` in all 4 edge functions |
| 3 | No prompt injection protection in chat | Critical | `app/api/contracts/[id]/chat/route.ts`, `supabase/functions/chat/index.ts` | Added `sanitizeForLLM()` from `lib/security/promptInjectionGuard.ts` |
| 4 | No rate limiting on any endpoint | High | All API routes | Created `lib/security/rateLimiter.ts` with sliding-window rate limiter; applied to upload and chat routes |
| 5 | File upload validates extension only — MIME type not checked | High | `app/api/contracts/upload/route.ts` | Added full MIME type check in `lib/security/inputValidator.ts`; updated upload route |
| 6 | Custom terms inserted into AI prompt without sanitization | High | `supabase/functions/process-contract/index.ts` | Added `sanitiseCustomTerm()` to strip non-word characters |
| 7 | Feedback `comment` field had no length limit | Medium | `supabase/functions/submit-feedback/index.ts` | Clamped comment to 1000 characters |
| 8 | Chat history limit hardcoded to 200 in edge function | Medium | `supabase/functions/chat/index.ts` | Now reads from `MAX_CHAT_HISTORY` env var (default 100) |
| 9 | No server-side login/logout routes — cookies not set correctly on login | Medium | — | Created `app/api/auth/login/route.ts` and `app/api/auth/logout/route.ts` |
| 10 | No `createAdminClient()` — no secure way to perform service-role operations | Medium | `lib/supabase/server.ts` | Added `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` |
| 11 | `SUPABASE_SERVICE_ROLE_KEY` potentially accessible outside admin client | Medium | Various | Key isolated to `createAdminClient()` and edge functions only |
| 12 | `MAX_CHAT_HISTORY` not in `.env.example` | Low | `.env.example` | Added with default value of 100 |
| 13 | No Zod validation on API routes | Low | All API routes | Created schemas in `lib/security/inputValidator.ts`; applied to upload and chat routes |

---

## Controls Implemented

### 1. Authentication & Protected Routes (`middleware.ts`)

- All routes under `/dashboard`, `/upload`, `/results`, `/contracts`, `/chat`, `/settings`, `/profile` redirect to `/login` if no session exists
- Authenticated users hitting `/login` or `/signup` are redirected to `/dashboard`
- Session is verified at the Next.js middleware layer on every request before the page renders

### 2. API Request Validation (`lib/security/inputValidator.ts`)

Zod schemas cover:
- `UploadBodySchema` — contractType enum, contractName max length
- `ChatMessageSchema` — message min/max length (1–5000 chars)
- `ProcessContractSchema` — customTerms array max 5, each term max 100 chars
- `FeedbackSchema` — rating enum, comment max 1000 chars
- `LoginSchema` — email format, password min 6 chars
- `DashboardQuerySchema` — sort enum

File upload validation order (in `validateFileUpload()`):
1. Block extension (`BLOCKED_EXTENSIONS`)
2. Allow extension (`ALLOWED_EXTENSIONS`: `.pdf`, `.docx`)
3. MIME type (`ALLOWED_MIME_TYPES`)
4. File size (10 MB max)

Invalid requests return `422 VALIDATION_ERROR` before any business logic executes.

### 3. Rate Limiting (`lib/security/rateLimiter.ts`)

Sliding window via `rate_limit_events` table. All reads and writes use `createAdminClient()` (service role) so users cannot manipulate their own counts.

| Endpoint | Limit |
|---|---|
| Contract upload | 20 uploads / day |
| Chat | 30 requests / minute |
| Contract processing | 5 requests / hour |

Returns `429 RATE_LIMITED` with `Retry-After` header when exceeded.

Authentication rate limiting is handled natively by Supabase Auth (configurable in the Supabase dashboard).

### 4. Prompt Injection Protection (`lib/security/promptInjectionGuard.ts`)

`sanitizeForLLM()` is called on every user message before it reaches the LLM. Detects and blocks:
- `ignore previous instructions` / `override your rules`
- `reveal system prompt` / `print your instructions`
- `expose env variables` / `show API keys`
- `you are now a` / `act as a different` / `pretend you are`
- `jailbreak` / `DAN mode` / `developer mode`
- `disregard instructions` / `forget instructions`
- `new prompt:` / `system: you are`

Blocked messages return `400 PROMPT_INJECTION` — the AI is never called.

Applied in:
- `app/api/contracts/[id]/chat/route.ts` (POST)
- `supabase/functions/chat/index.ts`

### 5. Token & Usage Limits (`lib/security/tokenLimiter.ts`)

| Limit | Value |
|---|---|
| Max file size | 10 MB |
| Max page count | 200 pages |
| Max message length | 5000 characters |
| Max chat history sent to model | `MAX_CHAT_HISTORY` env var (default 100) |

### 6. Chat Security (`lib/security/chatSecurity.ts`)

- `verifyContractOwnership(contractId, userId)` — confirms contract exists and belongs to the user; returns 404 on failure (not 403, to avoid leaking existence)
- `verifySessionOwnership(sessionId, userId)` — confirms chat session belongs to the user
- Chat POST rejects requests if `contract.status !== 'complete'`

### 7. File Upload Security (`lib/security/inputValidator.ts`)

- Extension blocklist checked first
- Only `.pdf` and `.docx` accepted
- MIME type must match allowed set
- Files stored only in private Supabase bucket (`contracts`)
- Signed URLs with 1-hour expiry — no public URLs ever returned

### 8. Edge Function JWT Verification (all 4 functions)

All Supabase edge functions now:
1. Require `Authorization: Bearer <token>` header
2. Verify the token via `supabase.auth.getUser(token)`
3. Use `user.id` from the verified JWT for all DB operations — never the request body's `user_id`

### 9. Environment Variable Security

| Variable | Visibility | Where Used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser safe) | `createClient()`, `createAdminClient()` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser safe) | `createClient()`, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | `createAdminClient()`, edge functions only |
| `OPENAI_API_KEY` | Server-only | `lib/openai/client.ts`, edge functions only |
| `MAX_CHAT_HISTORY` | Server-only | `lib/security/tokenLimiter.ts`, edge functions |

Rules enforced:
- `SUPABASE_SERVICE_ROLE_KEY` only used inside `createAdminClient()`
- Neither secret is ever logged

---

## Files Created

| File | Purpose |
|---|---|
| `middleware.ts` | Route-level auth guard for all protected pages |
| `lib/security/authGuard.ts` | `requireAuth()` — verifies session, returns user or 401 |
| `lib/security/rateLimiter.ts` | Sliding-window rate limiting via `rate_limit_events` table |
| `lib/security/promptInjectionGuard.ts` | `sanitizeForLLM()` — detects and blocks injection patterns |
| `lib/security/tokenLimiter.ts` | File size, page count, message length, chat history constants |
| `lib/security/chatSecurity.ts` | `verifyContractOwnership()` and `verifySessionOwnership()` |
| `lib/security/inputValidator.ts` | `validateFileUpload()` + all Zod schemas |
| `app/api/auth/login/route.ts` | Server-side login (sets cookies correctly) |
| `app/api/auth/logout/route.ts` | Server-side logout |
| `supabase/rls-policies.sql` | `rate_limit_events` table + idempotent RLS policies for all tables |
| `docs/security/security-plan.md` | This document |

## Files Modified

| File | Change |
|---|---|
| `lib/supabase/server.ts` | Added `createAdminClient()` |
| `app/api/contracts/upload/route.ts` | MIME validation, rate limiting, Zod schema, `requireAuth()` |
| `app/api/contracts/[id]/chat/route.ts` | Rate limiting, prompt injection guard, Zod schema, `requireAuth()`, `MAX_CHAT_HISTORY` |
| `supabase/functions/chat/index.ts` | JWT verification, prompt injection, message length, `MAX_CHAT_HISTORY` |
| `supabase/functions/process-contract/index.ts` | JWT verification, custom term sanitization |
| `supabase/functions/extract-text/index.ts` | JWT verification |
| `supabase/functions/submit-feedback/index.ts` | JWT verification, comment length, contract ownership check |
| `.env.example` | Added `MAX_CHAT_HISTORY` |

---

## SQL to Run in Supabase

Run `supabase/rls-policies.sql` in the Supabase SQL Editor. It is idempotent and safe to re-run.

Key addition: `rate_limit_events` table with index on `(user_id, action, created_at DESC)`.

---

## Environment Variables to Add to `.env.local`

```
MAX_CHAT_HISTORY=100
```

---

## Outstanding Items

- **Authentication rate limiting by IP**: The current rate limiter uses `user_id`, so it cannot throttle unauthenticated login attempts by IP. Supabase Auth has built-in rate limiting for sign-ins — enable it in the Supabase dashboard under **Authentication > Rate Limits**.
- **CORS restriction on edge functions**: Currently `'Access-Control-Allow-Origin': '*'`. For production, restrict to `NEXT_PUBLIC_APP_URL`. Update each edge function's `corsHeaders` when the production URL is known.
- **Content Security Policy**: Add CSP headers in `next.config.mjs` for XSS protection.
- **`useAuth.signOut()`**: The hook still calls Supabase `signOut()` directly. For full cookie cleanup, update it to call `POST /api/auth/logout` instead.

---
name: security-fix
description: >
  Scans the existing codebase for common security vulnerabilities and applies fixes automatically.
  Use this skill when the user says things like "fix security issues", "patch security bugs",
  "fix basic security", "security fixes", or "harden the app".
  Does not generate plans or service files — it reads, finds, and fixes only.
---

## Purpose

Scan the codebase for common security issues and fix every one found. No planning documents. No service files. Just find and fix.

---

## Process

Work through each check below in order. For every issue found, apply the fix immediately before moving to the next check. At the end, present a single summary table.

---

## Checks & Fixes

### 1. Hardcoded Secrets

Grep for hardcoded secret values:
```
grep -r "sk-\|Bearer \|AIza\|password\s*=\s*[\"']\|api_key\s*=\s*[\"']" --include="*.ts" --include="*.tsx" --include="*.js" .
```

**Fix:** Replace any hardcoded value with `process.env.YOUR_VAR_NAME`. Add the variable to `.env.example` with a placeholder value.

---

### 2. Secrets Logged to Console

Grep for console statements printing sensitive data:
```
grep -rn "console\.\(log\|error\|warn\)" --include="*.ts" --include="*.tsx" --include="*.js" .
```

**Fix:** Remove any `console.log` that prints `req.body`, request headers, tokens, user objects, passwords, or env vars. Replace with a safe log that omits the sensitive field.

---

### 3. Secrets Exposed to the Client

Grep for secret env vars prefixed with `NEXT_PUBLIC_`:
```
grep -rn "NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*TOKEN\|NEXT_PUBLIC_SERVICE_ROLE" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*" .
```

**Fix:** Rename to a server-only var (remove `NEXT_PUBLIC_`). Move any client-side reads of that var into an API route and call the route from the component instead.

---

### 4. API Routes Missing Auth

For every file in `app/api/**/route.ts` (or `pages/api/**`):
- Check if the route touches user data (reads from DB, writes, deletes).
- Check if there is an auth/session check near the top.

**Fix:** If missing, add an auth guard at the top of the handler before any DB call:

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

---

### 5. Error Responses Leaking Stack Traces

Grep for catch blocks that forward the raw error to the client:
```
grep -rn "error: e\b\|error: err\b\|error: error\b\|message: e\.message\|message: err\.message" --include="*.ts" --include="*.tsx" .
```

**Fix:** Replace with a generic message for the client response. Keep the full error in a server-side `console.error` only:

```ts
catch (error) {
  console.error('[route]', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

### 6. Security Headers Missing

Open `next.config.js` or `next.config.ts`.

**Fix:** If the `headers()` export is absent or missing any of the following, add them:

```js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options',        value: 'DENY' },
        { key: 'X-XSS-Protection',       value: '1; mode=block' },
        { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ]
},
```

Also add `poweredByHeader: false` to the config object if not already set.

---

### 7. Unsafe HTML Injection

Grep for dangerous patterns:
```
grep -rn "dangerouslySetInnerHTML\|innerHTML\s*=\|eval(\|new Function(" --include="*.ts" --include="*.tsx" --include="*.js" .
```

**Fix:**
- `eval()` / `new Function()` — remove and replace with a safe alternative.
- `dangerouslySetInnerHTML` — wrap the value with `DOMPurify.sanitize()`. Install `dompurify` and `@types/dompurify` if not present.
- `innerHTML =` — replace with `textContent =` where possible; otherwise sanitize first.

---

### 8. .gitignore Missing Env Files

Check `.gitignore` for env file entries.

**Fix:** If any of these are missing, add them:

```
.env
.env.local
.env*.local
```

---

## Completion

Present a summary table:

| # | Check | Status | Files Changed |
|---|---|---|---|
| 1 | Hardcoded secrets | Fixed / Clean | ... |
| 2 | Secrets in console.log | Fixed / Clean | ... |
| 3 | Secrets exposed to client | Fixed / Clean | ... |
| 4 | API routes missing auth | Fixed / Clean | ... |
| 5 | Stack traces in responses | Fixed / Clean | ... |
| 6 | Security headers | Fixed / Clean | ... |
| 7 | Unsafe HTML / eval | Fixed / Clean | ... |
| 8 | .gitignore env files | Fixed / Clean | ... |

If any issue could not be auto-fixed (e.g. requires architectural changes), list it under **Manual Actions Required** with a clear description of what to do.

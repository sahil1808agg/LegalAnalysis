# Spec 01 — Authentication

## Overview

Email/password authentication via Supabase Auth. Users sign up, verify their email, sign in, and are redirected to the dashboard. All protected routes check for a valid session server-side and redirect to `/login` if absent.

---

## Acceptance Criteria

- User can sign up with email + password (≥ 8 characters); receives verification email
- User cannot access `/dashboard`, `/upload`, or `/results/*` without a valid session
- Invalid credentials show a specific inline error — no generic "something went wrong"
- Session persists across page reloads (stored in browser cookie by Supabase)
- Sign-out clears the session and redirects to `/`
- Duplicate email on sign-up shows: "An account with this email already exists."
- Password < 8 chars shows inline validation before submission
- Auth service timeout shows: "Sign-up failed — please try again."
- Too many sign-in attempts shows: "Too many sign-in attempts. Please wait 60 seconds."

---

## Files to Create

```
contractiq/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          ← Sign-in page
│   │   └── signup/
│   │       └── page.tsx          ← Sign-up page
│   └── layout.tsx                ← Already exists; wrap with AuthProvider
├── components/
│   └── auth/
│       └── AuthModal.tsx         ← Reusable modal with sign-in/sign-up tabs
├── lib/
│   └── supabase/
│       ├── client.ts             ← Browser Supabase client
│       └── server.ts             ← Server Supabase client (for API routes / RSC)
├── hooks/
│   └── useAuth.ts                ← Auth state + helpers
└── context/
    └── AuthContext.tsx           ← AuthProvider wrapping the app
```

---

## Supabase Client Setup

### `lib/supabase/client.ts`
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `lib/supabase/server.ts`
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}
```

**Required package:** `@supabase/ssr` — add to `dependencies` in `package.json`.

---

## `hooks/useAuth.ts`

```ts
'use client'

import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password })
  }

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, session, loading, signUp, signIn, signOut }
}
```

---

## Sign-Up Page — `app/(auth)/signup/page.tsx`

**Route:** `/signup`  
**Protection:** Redirect to `/dashboard` if already authenticated (check session server-side in the page component).

**Form fields:**
- Email (`type="email"`, required)
- Password (`type="password"`, required, minLength=8)
- Submit button: "Create account"

**On submit:**
1. Client-side validate: email format, password ≥ 8 chars
2. Call `supabase.auth.signUp({ email, password })`
3. On success: show "Check your email to verify your account" message (do not auto-redirect — user must verify first)
4. On error `email_already_exists`: "An account with this email already exists."
5. On error `weak_password`: "Password must be at least 8 characters."
6. On network error: "Sign-up failed — please try again."

**Redirect logic (server-side in the page component):**
```ts
const { data: { session } } = await supabase.auth.getSession()
if (session) redirect('/dashboard')
```

---

## Sign-In Page — `app/(auth)/login/page.tsx`

**Route:** `/login`  
**Protection:** Redirect to `/dashboard` if already authenticated.

**Form fields:**
- Email (`type="email"`, required)
- Password (`type="password"`, required)
- Submit button: "Sign in"
- Link: "Don't have an account? Sign up" → `/signup`

**On submit:**
1. Call `supabase.auth.signInWithPassword({ email, password })`
2. On success: `router.push('/dashboard')`
3. On error `invalid_credentials`: "Incorrect email or password."
4. On error `email_not_confirmed`: "Please verify your email before signing in."
5. On error `over_request_rate_limit`: "Too many sign-in attempts. Please wait 60 seconds."
6. On network error: "Sign-in failed — please try again."

---

## Auth Guard — Protected Routes

Implement as a server-side check at the top of each protected page component:

```ts
// Pattern used in: app/(dashboard)/dashboard/page.tsx, app/upload/page.tsx,
//                  app/results/[contractId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  // ... rest of page
}
```

Do not use middleware for auth guards — keep it simple with per-page checks for MVP.

---

## `components/auth/AuthModal.tsx`

A modal with two tabs (Sign In / Sign Up) used on the landing page.

**Props:**
```ts
interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
}
```

**Behaviour:**
- Renders over the landing page
- Tab switching does not navigate routes
- On successful sign-in: close modal + redirect to `/dashboard`
- On successful sign-up: close modal + show inline "Check your email" message
- Close on backdrop click or Escape key
- `aria-modal="true"`, focus trap inside modal

---

## Error State Summary

| Scenario | Message |
|---|---|
| Invalid email format | "Please enter a valid email address." |
| Password < 8 chars | "Password must be at least 8 characters." |
| Duplicate email | "An account with this email already exists." |
| Wrong credentials | "Incorrect email or password." |
| Email not confirmed | "Please verify your email before signing in." |
| Rate limit hit | "Too many sign-in attempts. Please wait 60 seconds." |
| Network/service error | "Sign-up failed — please try again." |
| Unauthenticated route access | Redirect to `/login` (no error message shown) |

---

## Dependencies to Add

```json
"@supabase/supabase-js": "^2",
"@supabase/ssr": "^0.5"
```

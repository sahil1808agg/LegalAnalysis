# Spec 09 — Landing Page

## Overview

The public landing page (`/`) is the entry point for new visitors. It is a static Server Component — no data fetching, no client-side JS beyond the AuthModal. It communicates ContractIQ's value proposition and directs visitors to sign up or sign in.

---

## Acceptance Criteria

- Page renders without any auth check (publicly accessible)
- "Get Started" CTA → `/signup`; "Sign In" link → `/login`
- AuthModal can also be triggered from CTAs (alternative to page navigation)
- DisclaimerBanner is visible at the bottom of the page
- Page passes Lighthouse performance score ≥ 90 (static content, no heavy JS)
- All text is readable at 200% zoom (WCAG 1.4.4)
- No event handlers in the Server Component — all hover effects via CSS classes

---

## File

```
contractiq/
└── app/
    └── page.tsx    ← Already created in frontend-setup; expand content here
```

---

## Page Sections

### 1. Navigation Bar

```
[ContractIQ logo/wordmark]          [Sign In] [Get Started →]
```

- Logo: text-based (`ContractIQ`, font-semibold text-xl)
- "Sign In" → `/login` (btn-ghost)
- "Get Started" → `/signup` (btn-primary)
- Sticky top, white background, bottom border

### 2. Hero Section

**Headline (H1):**  
"Understand what you're signing — before you sign it."

**Subheadline (body-lg, grey-500):**  
"ContractIQ extracts key terms from NDAs and MSAs with AI precision. Source sentences, page references, and confidence scores — no lawyer required."

**CTA pill above headline:**  
"NDA & MSA review in ≤ 15 minutes" — blue-50 background, blue-500 text, rounded-full border

**Primary CTA:** "Review your first contract free" → `/signup`  
**Secondary CTA:** "Sign In" → `/login`

**Social proof line:**  
"No credit card required · Text-layer PDFs only · NDAs & MSAs"  
(text-xs, grey-400)

### 3. Feature Cards (3 columns)

| Icon | Title | Body |
|---|---|---|
| ⚡ | Instant extraction | "GPT-4o identifies governing law, liability caps, IP ownership, and 10+ other key terms — with the exact page number and source sentence." |
| 🎯 | Confidence scoring | "Every term gets a confidence score. Low-confidence terms are flagged with ⚠️ so you know exactly where to double-check." |
| 💬 | Chat with your contract | "Ask plain-English questions and get document-grounded answers with mandatory page citations. No hallucinations." |

Card style: white border (grey-100), grey-25 background, rounded-lg, p-6.

### 4. Footer

**Legal disclaimer:**  
"ContractIQ is an AI-assisted review tool, not legal advice. Always verify critical terms with a qualified lawyer."  
(text-xs, grey-400, centred)

Border-top, py-5.

---

## Implementation Notes

- This page is already scaffolded from the frontend-setup skill; this spec describes the intended final state for the landing page during feature implementation.
- The `AuthModal` component (built in Spec 01) can be optionally wired in to the "Get Started" CTA to open the modal instead of navigating to `/signup`. Implement simple navigation (href) first; modal variant can be added later.
- All CSS hover states use Tailwind `hover:` utility classes — no `onMouseOver` event handlers (page is a Server Component).

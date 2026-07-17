# Spec 10 — Shared Types, Utilities & Project Setup

## Overview

This spec covers the foundational files that every other spec depends on: TypeScript type definitions, utility functions, and the package dependencies that must be installed.

---

## `types/index.ts`

```ts
// ==========================================================================
// Domain types
// ==========================================================================

export type ContractStatus = 'pending' | 'processing' | 'complete' | 'error'
export type ContractType   = 'NDA' | 'MSA'
export type UserRole       = 'user' | 'assistant'
export type FeedbackRating = 'up' | 'down'

export interface Contract {
  id: string
  name: string
  type: ContractType
  status: ContractStatus
  pageCount: number
  tokenCount: number | null
  createdAt: string
  lastAccessedAt: string
  signedUrl: string | null   // null when Storage unavailable
  keyTerms: KeyTerm[]
}

export interface DashboardContract {
  id: string
  name: string
  type: ContractType
  status: ContractStatus
  pageCount: number
  createdAt: string
}

export interface KeyTerm {
  id: string
  contractId: string
  termName: string
  value: string
  pageNumber: number
  confidenceScore: number    // 0.0 – 1.0
  sourceSentence: string
  isCustom: boolean
  isEdited: boolean
  originalAiValue: string | null
  createdAt: string
}

export interface ChatSession {
  id: string
  contractId: string
  userId: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: UserRole
  content: string
  createdAt: string
}

export interface UserFeedback {
  id: string
  contractId: string
  rating: FeedbackRating
  comment: string | null
  createdAt: string
}

// ==========================================================================
// API response types
// ==========================================================================

export interface UploadResponse {
  contractId: string
  pageCount: number
  status: ContractStatus
}

export interface ProcessResponse {
  contractId: string
  status: ContractStatus
}

export interface ContractResponse extends Contract {}

export interface TermUpdateResponse {
  id: string
  value: string
  isEdited: boolean
  originalAiValue: string | null
}

export interface ChatResponse {
  messageId: string
  sessionId: string
  role: UserRole
  content: string
  createdAt: string
}

export interface ChatHistoryResponse {
  sessionId: string | null
  messages: ChatMessage[]
}

export interface DashboardResponse {
  stats: {
    total: number
    byType: { NDA: number; MSA: number }
  }
  contracts: DashboardContract[]
}

export interface FeedbackResponse {
  feedbackId: string
}
```

---

## `lib/utils/cn.ts`

Class name utility using `clsx` + `tailwind-merge`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Add to `package.json` dependencies:**
```json
"clsx": "^2",
"tailwind-merge": "^2"
```

---

## `lib/utils/formatDate.ts`

```ts
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  // e.g. "Jul 16, 2026"
}
```

---

## `lib/utils/sanitiseFilename.ts`

```ts
export function sanitiseFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // replace unsafe chars with underscore
    .replace(/__+/g, '_')               // collapse multiple underscores
    .slice(0, 100)                      // cap at 100 chars
}
```

Used in `POST /api/contracts/upload` when storing the contract name.

---

## `lib/utils/tokenEstimate.ts`

```ts
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
```

Used in `extract-text` edge function to check the 15,000-token limit before calling OpenAI.

---

## Required Dependencies

Add these to `contractiq/package.json` before starting feature implementation:

```json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "pdfjs-dist": "^3.11.174",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## Environment Variables Reference

All environment variables the app needs — defined here for developer clarity; actual values go in `.env.local` (never committed).

| Variable | Used In | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase public key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full DB access for API routes + Edge Function callers |
| `OPENAI_API_KEY` | Edge Functions only | GPT-4o API calls |
| `NEXT_PUBLIC_APP_URL` | Client + Server | Full app URL for auth redirects |

---

## Folder Structure Reference (Complete)

```
contractiq/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── upload/
│   │   └── page.tsx
│   ├── results/
│   │   └── [contractId]/
│   │       └── page.tsx
│   ├── api/
│   │   ├── contracts/
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts          (GET)
│   │   │       ├── process/
│   │   │       │   └── route.ts      (POST)
│   │   │       ├── terms/
│   │   │       │   └── [termId]/
│   │   │       │       └── route.ts  (PATCH)
│   │   │       ├── chat/
│   │   │       │   └── route.ts      (GET + POST)
│   │   │       └── feedback/
│   │   │           └── route.ts      (POST)
│   │   └── dashboard/
│   │       └── route.ts              (GET)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   │   └── AuthModal.tsx
│   ├── upload/
│   │   ├── ContractTypeSelector.tsx
│   │   ├── PDFUploader.tsx
│   │   ├── KeyTermPreview.tsx
│   │   ├── CustomTermInput.tsx
│   │   └── ProcessButton.tsx
│   ├── results/
│   │   ├── KeyTermsPanel.tsx
│   │   ├── TermCard.tsx
│   │   ├── ConfidenceBadge.tsx
│   │   ├── SourceSentenceTooltip.tsx
│   │   ├── PDFViewer.tsx
│   │   └── TextViewerFallback.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   └── ChatMessage.tsx
│   ├── dashboard/
│   │   ├── DashboardStats.tsx
│   │   └── DashboardTable.tsx
│   ├── shared/
│   │   ├── DisclaimerBanner.tsx
│   │   ├── FeedbackWidget.tsx
│   │   ├── ErrorBanner.tsx
│   │   └── ProcessingProgress.tsx
│   └── ui/                           ← Primitive UI components (button, badge, input, card)
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useChat.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── openai/
│   │   ├── client.ts
│   │   ├── extractionPrompt.ts
│   │   └── chatPrompt.ts
│   └── utils/
│       ├── cn.ts
│       ├── formatDate.ts
│       ├── sanitiseFilename.ts
│       └── tokenEstimate.ts
├── types/
│   └── index.ts
├── styles/
│   └── globals.css
├── public/
│   └── pdf.worker.min.js             ← Copy from pdfjs-dist after npm install
├── supabase/
│   └── functions/
│       ├── extract-text/index.ts
│       ├── process-contract/index.ts
│       ├── chat/index.ts
│       └── submit-feedback/index.ts
├── .env.example
├── .env.local                        ← NOT committed; copy from .env.example
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

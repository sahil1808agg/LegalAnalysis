# Spec 04 — Results Page

## Overview

The results page (`/results/[contractId]`) is the core review experience. It shows a two-panel layout: a PDF/text viewer on the left and a key terms panel on the right. Users can click a page reference to scroll the viewer, expand source sentences, edit terms inline, and submit feedback.

---

## Acceptance Criteria

- Page loads within 3 s of navigation (key terms fetched on mount)
- Two panels visible side-by-side on desktop; stacked on mobile
- Each term card shows: term name, extracted value, page number (clickable), confidence badge, "Why?" tooltip, and an edit button
- Confidence badge: green (≥ 0.8), amber (0.5–0.79), red (< 0.5) + ⚠️ icon below 0.5
- Clicking a page number scrolls the left panel to that page
- ⚠️ warning on low-confidence terms is non-dismissible
- Edit button puts the term into edit mode (inline input); saving calls PATCH API
- After save: "Edited" badge appears; original AI value is retained in DB
- Save completes within 2 s
- DisclaimerBanner "Not legal advice" is always visible and not dismissible
- FeedbackWidget submits successfully once per contract; second attempt shows error
- Own-contract guard: attempting to view another user's contract returns 403 → redirect to dashboard

---

## Files to Create

```
contractiq/
├── app/
│   └── results/
│       └── [contractId]/
│           └── page.tsx                    ← Results page (protected)
├── components/
│   ├── results/
│   │   ├── KeyTermsPanel.tsx               ← Scrollable list of TermCards
│   │   ├── TermCard.tsx                    ← Single term (name, value, page, confidence, edit)
│   │   ├── ConfidenceBadge.tsx             ← Colour-coded badge + ⚠️
│   │   └── SourceSentenceTooltip.tsx       ← Expandable "Why?" section
│   └── shared/
│       ├── DisclaimerBanner.tsx            ← "Not legal advice" banner
│       ├── FeedbackWidget.tsx              ← Thumbs up/down + comment
│       └── ErrorBanner.tsx                 ← Generic error with optional retry CTA
└── app/
    └── api/
        └── contracts/
            └── [id]/
                ├── route.ts                ← GET /api/contracts/[id]
                └── terms/
                    └── [termId]/
                        └── route.ts        ← PATCH /api/contracts/[id]/terms/[termId]
```

---

## Results Page — `app/results/[contractId]/page.tsx`

**Route:** `/results/[contractId]`  
**Type:** Starts as a Server Component for auth check + initial data fetch; hands off to Client Components for interactivity.

**Server-side (page component):**
1. Check session — redirect to `/login` if absent
2. Fetch contract + key terms via `GET /api/contracts/[id]`
3. If 403 → redirect to `/dashboard`
4. If 404 → redirect to `/dashboard`
5. Update `last_accessed_at` (via API route)
6. Pass data as props to Client Components

**Layout (two-panel):**
```
┌─────────────────────────────────────────────────┐
│  DisclaimerBanner (full width, sticky top)      │
├───────────────────────────┬─────────────────────┤
│  PDF/Text Viewer (left)   │  Key Terms Panel    │
│  — PDFViewer or           │  — TermCard × N     │
│    TextViewerFallback      │  — FeedbackWidget   │
│                           │                     │
│  (Chat tab/sidebar below) │                     │
└───────────────────────────┴─────────────────────┘
```

**State (in the Client Component wrapper):**
```ts
const [targetPage, setTargetPage] = useState<number>(1)
const [keyTerms, setKeyTerms] = useState<KeyTerm[]>(initialKeyTerms)
```

`targetPage` is passed to both `PDFViewer` and `TextViewerFallback`. When a term's page number is clicked, `setTargetPage(pageNumber)` is called.

---

## `components/results/KeyTermsPanel.tsx`

**Props:**
```ts
interface KeyTermsPanelProps {
  terms: KeyTerm[]
  onPageSelect: (page: number) => void
  onTermUpdate: (termId: string, newValue: string) => void
}
```

Renders a scrollable list of `TermCard` components. Standard terms appear first; custom terms (`is_custom === true`) appear at the bottom.

**Skeleton state:** While data is loading, render 6 skeleton `TermCard` placeholder boxes (animated shimmer).

---

## `components/results/TermCard.tsx`

**Props:**
```ts
interface TermCardProps {
  term: KeyTerm
  onPageSelect: (page: number) => void
  onUpdate: (termId: string, newValue: string) => Promise<void>
}
```

**KeyTerm type:**
```ts
interface KeyTerm {
  id: string
  termName: string
  value: string
  pageNumber: number
  confidenceScore: number   // 0.0 – 1.0
  sourceSentence: string
  isCustom: boolean
  isEdited: boolean
  originalAiValue: string | null
}
```

**Renders:**
```
┌─────────────────────────────────────────────────────┐
│  [Term Name]          [Custom badge?] [Edited badge?]│
│  [Value]                                             │
│  Page [N] ← clickable    [ConfidenceBadge]          │
│  [SourceSentenceTooltip "Why?"]                     │
│  [Edit button]                                      │
└─────────────────────────────────────────────────────┘
```

**Edit mode:**
1. "Edit" button clicked → replace value display with `<input>` pre-filled with current value
2. Show "Save" and "Cancel" buttons
3. "Save" → call `onUpdate(term.id, newValue)` → PATCH API
4. On success → update local state, show "Edited" badge
5. "Cancel" → restore previous display
6. While saving → disable Save button, show spinner
7. If value is empty → disable Save button

**"Edited" badge:** Blue badge showing "Edited". Tooltip on hover shows: `"AI extracted: ${originalAiValue}"`

---

## `components/results/ConfidenceBadge.tsx`

**Props:**
```ts
interface ConfidenceBadgeProps {
  score: number   // 0.0 – 1.0
}
```

**Colour rules:**
| Score | Background | Border | Text | Icon |
|---|---|---|---|---|
| ≥ 0.8 | green-50 | green-500 | green-700 | ✓ |
| 0.5 – 0.79 | yellow-50 | yellow-500 | yellow-800 | — |
| < 0.5 | red-50 | red-500 | red-700 | ⚠️ |

**Display:** `{Math.round(score * 100)}%` — e.g. "94%", "47%"

**Low-confidence tooltip (score < 0.5):**  
Non-dismissible inline message below the badge:  
"Low confidence — we recommend verifying this in the document directly."

**Accessibility:** Uses colour + icon (never colour alone). `aria-label="Confidence: 94%, high"` / `aria-label="Confidence: 47%, low — verify manually"`.

---

## `components/results/SourceSentenceTooltip.tsx`

**Props:**
```ts
interface SourceSentenceTooltipProps {
  sourceSentence: string
}
```

**Renders:** A collapsed "Why?" toggle button. On click/Enter, expands to show the verbatim `sourceSentence` in a styled quote block.

**Accessibility:** Toggle triggered by keyboard (focus + Enter/Space).

---

## `components/shared/DisclaimerBanner.tsx`

No props. Renders a non-dismissible banner at the top of the results page:

> "This is an AI-assisted review tool, not legal advice. Always verify critical terms with a qualified lawyer."

Yellow background (yellow-50), yellow-800 text, ⚠️ icon. Position: sticky top.

---

## `components/shared/FeedbackWidget.tsx`

**Props:**
```ts
interface FeedbackWidgetProps {
  contractId: string
}
```

**State:**
```ts
const [rating, setRating] = useState<'up' | 'down' | null>(null)
const [comment, setComment] = useState('')
const [submitted, setSubmitted] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**Renders:** 👍 / 👎 buttons + optional comment `<textarea>` + "Submit feedback" button.

**On submit:**
1. POST to `/api/contracts/[contractId]/feedback` with `{ rating, comment }`
2. On 201 → `setSubmitted(true)` → show "Thank you for your feedback!"
3. On 409 → "You've already submitted feedback for this contract."
4. On other error → "Feedback failed. Please try again."

---

## API Route — `GET /api/contracts/[id]`

**File:** `app/api/contracts/[id]/route.ts`

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme_NDA_2026.pdf",
  "type": "NDA",
  "status": "complete",
  "pageCount": 14,
  "createdAt": "2026-07-16T10:30:00Z",
  "signedUrl": "https://...",   // null if file_path is null
  "keyTerms": [
    {
      "id": "uuid",
      "termName": "Governing Law",
      "value": "State of Delaware",
      "pageNumber": 8,
      "confidenceScore": 0.94,
      "sourceSentence": "This Agreement shall be governed by...",
      "isCustom": false,
      "isEdited": false,
      "originalAiValue": null
    }
  ]
}
```

**Implementation:**
1. Auth check; verify `user_id` matches
2. `SELECT * FROM contracts WHERE id = $id AND user_id = $uid`
3. If not found → 404; if wrong user → 403
4. If `file_path` is not null → generate 1-hour signed URL:
   `supabase.storage.from('contracts').createSignedUrl(file_path, 3600)`
5. `SELECT * FROM key_terms WHERE contract_id = $id ORDER BY created_at ASC`
6. Update `last_accessed_at`:
   `UPDATE contracts SET last_accessed_at = now() WHERE id = $id`
7. Return combined response

---

## API Route — `PATCH /api/contracts/[id]/terms/[termId]`

**File:** `app/api/contracts/[id]/terms/[termId]/route.ts`

**Request body:** `{ "value": "Corrected value" }`

**Implementation:**
1. Auth check
2. Fetch term: `SELECT * FROM key_terms WHERE id = $termId AND contract_id = $id AND user_id = $uid`
3. If not found → 404; if wrong user → 403
4. If `value` is empty string → 400 `"Value cannot be empty."`
5. Build update:
   ```sql
   UPDATE key_terms
   SET value             = $new_value,
       original_ai_value = CASE WHEN is_edited = false THEN value ELSE original_ai_value END,
       is_edited         = true
   WHERE id = $termId
   RETURNING *
   ```
6. Return 200 `{ id, value, isEdited: true, originalAiValue }`

**Must complete within 2 s.** No heavy processing — single row update.

---

## API Route — `POST /api/contracts/[id]/feedback`

**File:** `app/api/contracts/[id]/feedback/route.ts`

**Request body:** `{ "rating": "up" | "down", "comment": "optional string" }`

**Implementation:**
1. Auth check; validate `rating` is "up" or "down"
2. INSERT into `user_feedback`; on unique constraint violation → 409
3. Return 201 `{ feedbackId }`

---

## TypeScript Types — `types/index.ts`

```ts
export type ContractStatus = 'pending' | 'processing' | 'complete' | 'error'
export type ContractType   = 'NDA' | 'MSA'

export interface Contract {
  id: string
  name: string
  type: ContractType
  status: ContractStatus
  pageCount: number
  createdAt: string
  signedUrl: string | null
  keyTerms: KeyTerm[]
}

export interface KeyTerm {
  id: string
  termName: string
  value: string
  pageNumber: number
  confidenceScore: number
  sourceSentence: string
  isCustom: boolean
  isEdited: boolean
  originalAiValue: string | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface UserFeedback {
  id: string
  contractId: string
  rating: 'up' | 'down'
  comment: string | null
  createdAt: string
}
```

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| All terms have confidence ≥ 0.8 | No ⚠️ warnings shown |
| Term value is very long | Truncate at 200 chars in display with "Show more" toggle |
| User edits a term that was already edited | `original_ai_value` stays as the first AI value (not overwritten again) |
| User edits then cancels | No API call; display reverts to current saved value |
| Page number is 0 or negative | Treat as page 1 in viewer |
| `signedUrl` is null (Storage failed at upload) | Show TextViewerFallback silently; no error banner |
| Contract `status` is `'error'` | Show ErrorBanner with "Try Again" CTA that calls `POST /api/contracts/[id]/process` |
| Contract `status` is `'processing'` | Show progress spinner; auto-poll until complete |

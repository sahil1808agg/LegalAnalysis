# Spec 07 — Dashboard

## Overview

The dashboard (`/dashboard`) is the authenticated home screen. It shows a sortable list of all contracts the user has uploaded, along with summary stats (total count, NDA vs. MSA breakdown). An empty state is shown when no contracts exist. Clicking a row opens the results page.

---

## Acceptance Criteria

- Dashboard is only accessible to authenticated users (redirect to `/login` otherwise)
- Shows count cards: total contracts, NDA count, MSA count
- Table rows show: contract name, type badge, status badge, page count, created date
- Table is sortable by: date (desc default), date asc, name asc, type
- Clicking a row navigates to `/results/[contractId]`
- Empty state: illustration + "Upload your first contract to begin" + CTA button → `/upload`
- Contracts with `status = 'error'` show a red "Error" badge; clicking opens results page with retry CTA
- Contracts with `status = 'processing'` show a spinner badge; clicking opens a status polling page
- Dashboard data refreshes on focus (user returns to tab after processing)

---

## Files to Create

```
contractiq/
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           └── page.tsx                ← Dashboard page (protected)
├── components/
│   └── dashboard/
│       ├── DashboardStats.tsx          ← Three count cards
│       └── DashboardTable.tsx          ← Sortable contract history table
└── app/
    └── api/
        └── dashboard/
            └── route.ts               ← GET /api/dashboard
```

---

## Dashboard Page — `app/(dashboard)/dashboard/page.tsx`

**Route:** `/dashboard`  
**Type:** Server Component for auth check + initial data fetch; passes data to Client Components.

**Server-side:**
1. Check session — redirect to `/login` if absent
2. Fetch `GET /api/dashboard?sort=date_desc` for initial data
3. Pass stats + contracts as props

**Client Component wrapper** handles:
- Sort state: `const [sort, setSort] = useState<SortOption>('date_desc')`
- On sort change: re-fetch `GET /api/dashboard?sort=${sort}`
- `window.addEventListener('focus', refetch)` — refresh when user returns to tab
- Navigation on row click: `router.push('/results/' + contract.id)`

---

## `components/dashboard/DashboardStats.tsx`

**Props:**
```ts
interface DashboardStatsProps {
  total: number
  byType: { NDA: number; MSA: number }
}
```

**Renders:** Three stat cards side by side.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  12          │  │  8           │  │  4           │
│  Total       │  │  NDAs        │  │  MSAs        │
└──────────────┘  └──────────────┘  └──────────────┘
```

Each card: white background, grey-100 border, rounded-lg, p-6. Number: text-3xl font-bold text-grey-900. Label: type-body-sm text-grey-500.

---

## `components/dashboard/DashboardTable.tsx`

**Type:** `'use client'`

**Props:**
```ts
interface DashboardTableProps {
  contracts: DashboardContract[]
  sort: SortOption
  onSortChange: (sort: SortOption) => void
}

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'type'

interface DashboardContract {
  id: string
  name: string
  type: 'NDA' | 'MSA'
  status: ContractStatus
  pageCount: number
  createdAt: string
}
```

**Table columns:**
| Column | Sortable | Notes |
|---|---|---|
| Contract Name | name_asc | Truncate at 40 chars |
| Type | type | "NDA" or "MSA" badge |
| Status | — | See status badges below |
| Pages | — | Integer |
| Date | date_desc / date_asc | Format: "Jul 16, 2026" |

**Sort UI:** Clicking a sortable column header toggles the sort; active column shows ↑ or ↓ arrow.

**Status badges:**

| Status | Badge style | Text |
|---|---|---|
| `complete` | badge-success | Complete |
| `processing` | yellow-50/yellow-500 + spinner | Processing |
| `pending` | grey-50/grey-300 | Pending |
| `error` | badge-error | Error |

**Row click:** `router.push('/results/' + contract.id)`

**Empty state (when `contracts.length === 0`):**
```
[Illustration placeholder div — 120px × 120px grey-100 rounded]
No contracts yet — upload your first contract to begin.
[Button: "Review a Contract" → /upload]
```

---

## API Route — `GET /api/dashboard`

**File:** `app/api/dashboard/route.ts`  
**Auth:** Required.

**Query params:**
- `sort`: `date_desc` (default) | `date_asc` | `name_asc` | `type`

**Implementation:**

```ts
const sortMap = {
  date_desc: 'created_at DESC',
  date_asc:  'created_at ASC',
  name_asc:  'name ASC',
  type:      'type ASC, created_at DESC',
}

// SQL
SELECT id, name, type, status, page_count, created_at
FROM contracts
WHERE user_id = $uid
ORDER BY {sortMap[sort]}
```

**Stats calculation:**
```ts
const total = contracts.length
const byType = {
  NDA: contracts.filter(c => c.type === 'NDA').length,
  MSA: contracts.filter(c => c.type === 'MSA').length,
}
```

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

## Edge Cases

| Scenario | Behaviour |
|---|---|
| User has 0 contracts | Empty state shown |
| Contract name > 40 chars | Truncated with ellipsis; full name in `title` attribute |
| Processing contract in list | Spinner badge; clicking opens results page with poll |
| Error contract in list | Error badge; clicking opens results page with retry CTA |
| Sort param missing from URL | Default to `date_desc` |
| Invalid sort param | Default to `date_desc` |
| Very large contract list (50+) | No pagination in MVP; table scrolls; add pagination in v1.1 |

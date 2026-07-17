# Spec 05 — PDF Viewer & Text Fallback

## Overview

The results page shows contract content in a left panel using one of two viewers: `PDFViewer` (PDF.js, when a signed Storage URL is available) or `TextViewerFallback` (parses `[PAGE N]` markers from `contract_text`, when no signed URL is available). Both accept a `targetPage` prop and scroll to the specified page when it changes.

---

## Acceptance Criteria

- PDF renders all pages via PDF.js; pages are lazy-loaded for performance
- Viewer scrolls to `targetPage` smoothly when a key term's page number is clicked
- Zoom in/out controls work on the PDF viewer
- TextViewerFallback correctly segments text at `[PAGE N]` markers
- TextViewerFallback scrolls to the correct section when `targetPage` changes
- If `signedUrl` is null, TextViewerFallback renders with no user-visible error (fails silently)
- Signed URL is requested fresh on every results page load (1-hour expiry)
- PDF viewer keyboard-navigable (arrow keys for page scroll, +/- for zoom)
- No console errors when switching between pages

---

## Files to Create

```
contractiq/
├── components/
│   └── results/
│       ├── PDFViewer.tsx           ← PDF.js renderer
│       └── TextViewerFallback.tsx  ← [PAGE N] text parser + paginated display
```

---

## `components/results/PDFViewer.tsx`

**Type:** `'use client'` — uses browser APIs and PDF.js.

**Props:**
```ts
interface PDFViewerProps {
  signedUrl: string
  targetPage: number      // 1-indexed; changes trigger scroll
  totalPages: number
}
```

**Required package:** `pdfjs-dist`
```json
"pdfjs-dist": "^3.11.174"
```

**Implementation approach:**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
// Copy pdf.worker.min.js from node_modules/pdfjs-dist/build/ to public/
```

**Rendering strategy:**
- Use `pdfjsLib.getDocument(signedUrl)` to load the PDF
- Render each page onto a `<canvas>` element (one canvas per page, stacked vertically)
- Lazy-load: only render pages within ±2 of the current viewport
- On `targetPage` change: use `element.scrollIntoView({ behavior: 'smooth' })` on the target page's canvas

**Zoom:**
- Scale state: `const [scale, setScale] = useState(1.0)`
- Zoom in (+): `setScale(s => Math.min(s + 0.25, 3.0))`
- Zoom out (−): `setScale(s => Math.max(s - 0.25, 0.5))`
- Re-render all pages when scale changes

**Page ref mapping:**
```ts
const pageRefs = useRef<(HTMLDivElement | null)[]>([])
// pageRefs.current[pageNumber - 1] = the div wrapping that page's canvas
```

**Keyboard navigation:**
```ts
// Arrow Down / Arrow Right → scroll to next page
// Arrow Up / Arrow Left → scroll to previous page
// +/= → zoom in; - → zoom out
```
Add `tabIndex={0}` to the container div and handle `onKeyDown`.

**Loading state:** Show a spinner while PDF loads. Show page skeletons while individual pages render.

**Error state:** If PDF.js fails to load the URL (e.g. expired signed URL): render a plain text message "PDF preview unavailable. Use the text viewer." with a button to switch to `TextViewerFallback`. Do not reload the page.

---

## PDF.js Worker Setup

Copy the worker file to `public/` during build. Add to `next.config.mjs`:

```js
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}
```

And as a one-time setup step (run after `npm install`):
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf.worker.min.js
```

Document this in the project README.

---

## `components/results/TextViewerFallback.tsx`

**Type:** `'use client'`

**Props:**
```ts
interface TextViewerFallbackProps {
  contractText: string    // full text with [PAGE N] markers
  targetPage: number      // 1-indexed; changes trigger scroll
}
```

**Parsing `contractText`:**

```ts
function parsePages(text: string): string[] {
  // Split on [PAGE N] markers, preserving page content
  const parts = text.split(/\[PAGE \d+\]/)
  return parts.filter(p => p.trim().length > 0)
}
```

Example input:
```
Some preamble text [PAGE 1] Content of page 1... [PAGE 2] Content of page 2...
```
Results in: `['Some preamble text ', ' Content of page 1... ', ' Content of page 2...']`

**Page ref mapping (same pattern as PDFViewer):**
```ts
const pageRefs = useRef<(HTMLDivElement | null)[]>([])
```

**On `targetPage` change:**
```ts
useEffect(() => {
  pageRefs.current[targetPage - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}, [targetPage])
```

**Page display:**
Each page renders in a bordered `<div>` with a page number header:
```
┌─────────────────────────────┐
│  Page 3                     │
│─────────────────────────────│
│  [page content text]        │
└─────────────────────────────┘
```

**Typography:** `font-mono text-sm leading-relaxed` — preserves contract text formatting.

---

## Viewer Selection Logic (in `app/results/[contractId]/page.tsx`)

```tsx
{signedUrl ? (
  <PDFViewer
    signedUrl={signedUrl}
    targetPage={targetPage}
    totalPages={pageCount}
  />
) : (
  <TextViewerFallback
    contractText={contractText}
    targetPage={targetPage}
  />
)}
```

No error message is shown when falling back to `TextViewerFallback` — the fallback renders silently.

---

## Signed URL Generation

Done inside `GET /api/contracts/[id]` every time the results page loads:

```ts
const { data } = await supabase.storage
  .from('contracts')
  .createSignedUrl(contract.file_path, 3600)  // 1-hour expiry

signedUrl = data?.signedUrl ?? null
```

If `file_path` is null (Storage failed at upload time), `signedUrl` is null → `TextViewerFallback` is used.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| targetPage = 0 | Clamp to page 1 |
| targetPage > totalPages | Clamp to totalPages |
| PDF file corrupted | PDF.js throws; show "PDF preview unavailable" message |
| Signed URL expired mid-session | PDF.js load fails; show "PDF preview unavailable" message; do not redirect |
| `[PAGE N]` markers missing from contractText | Treat entire text as page 1 |
| Very long page content in text fallback | Natural scroll within the page div |
| Scale change while loading | Queue the scale change; apply after render |

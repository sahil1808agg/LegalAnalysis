import { z } from 'zod'

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const UploadBodySchema = z.object({
  contractType: z.enum(['NDA', 'MSA']),
  contractName: z.string().max(200).optional(),
})

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
})

export const ProcessContractSchema = z.object({
  customTerms: z.array(z.string().max(100)).max(5).default([]),
})

export const FeedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
  comment: z.string().max(1000).optional(),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const DashboardQuerySchema = z.object({
  sort: z.enum(['date_desc', 'date_asc', 'name_asc', 'type']).default('date_desc'),
})

// ─── File Upload Validation ──────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx'])
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.js', '.mjs', '.cjs', '.php', '.zip',
  '.sh', '.bat', '.cmd', '.py', '.rb', '.ps1',
])
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export interface FileValidationResult {
  ok: boolean
  error?: string
  status?: number
}

export function validateFileUpload(file: File): FileValidationResult {
  const nameParts = file.name.split('.')
  const ext = nameParts.length > 1 ? '.' + nameParts.pop()!.toLowerCase() : ''

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'File type not allowed.', status: 422 }
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'Only PDF and DOCX files are accepted.', status: 422 }
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: 'File MIME type is not allowed.', status: 422 }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'File is too large. Maximum file size is 10 MB.', status: 422 }
  }

  return { ok: true }
}

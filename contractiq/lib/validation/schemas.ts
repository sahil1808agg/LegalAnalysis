import { z } from 'zod'

export const UploadSchema = z.object({
  contract_type: z.enum(['NDA', 'MSA']),
  title: z.string().max(200).optional(),
})

export const ProcessSchema = z.object({
  contract_id: z.string().uuid(),
})

export const ChatSchema = z.object({
  contract_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
})

export const PatchTermSchema = z.object({
  value: z.string().min(1).max(1000),
})

export const AddCustomTermSchema = z.object({
  term_name: z.string().min(1).max(100),
})

export const FeedbackSchema = z.object({
  contract_id: z.string().uuid(),
  rating: z.enum(['up', 'down']),
  comment: z.string().max(500).optional(),
})

export type UploadInput = z.infer<typeof UploadSchema>
export type ProcessInput = z.infer<typeof ProcessSchema>
export type ChatInput = z.infer<typeof ChatSchema>
export type PatchTermInput = z.infer<typeof PatchTermSchema>
export type AddCustomTermInput = z.infer<typeof AddCustomTermSchema>
export type FeedbackInput = z.infer<typeof FeedbackSchema>

// ─── Contract ────────────────────────────────────────────────────────────────

export type ContractStatus = 'pending' | 'processing' | 'completed' | 'error'
export type ContractType = 'NDA' | 'MSA'

export interface Contract {
  id: string
  user_id: string
  title: string
  contract_type: ContractType
  contract_text: string
  status: ContractStatus
  file_path: string | null
  error_message: string | null
  page_count: number | null
  created_at: string
  updated_at: string
}

// Lighter shape for the dashboard list (no contract_text)
export interface ContractSummary {
  id: string
  title: string
  contract_type: ContractType
  status: ContractStatus
  created_at: string
}

// ─── Key Terms ───────────────────────────────────────────────────────────────

export interface KeyTerm {
  id: string
  contract_id: string
  user_id: string
  term_name: string
  value: string
  original_value: string | null
  page_number: number
  confidence_score: number
  source_sentence: string | null
  is_custom: boolean
  is_edited: boolean
  created_at: string
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export interface ChatSession {
  id: string
  contract_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: ChatRole
  content: string
  page_citation: number | null
  created_at: string
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export type FeedbackRating = 'up' | 'down'

export interface UserFeedback {
  id: string
  user_id: string
  contract_id: string
  rating: FeedbackRating
  comment: string | null
  created_at: string
}

// ─── API request / response shapes ───────────────────────────────────────────

export interface UploadContractResponse {
  contract_id: string
  status: ContractStatus
}

export interface ProcessContractResponse {
  status: ContractStatus
}

export interface ContractStatusResponse {
  status: ContractStatus
  error_message: string | null
}

export interface KeyTermsResponse {
  terms: KeyTerm[]
}

export interface SignedUrlResponse {
  signed_url: string
}

export interface ChatResponse {
  message: ChatMessage
}

export interface PatchTermResponse {
  term: Pick<KeyTerm, 'id' | 'value' | 'is_edited' | 'original_value'>
}

export interface FeedbackResponse {
  feedback_id: string
}

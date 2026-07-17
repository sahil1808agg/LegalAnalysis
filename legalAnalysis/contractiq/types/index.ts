export type ContractStatus = 'pending' | 'processing' | 'complete' | 'error'
export type ContractType = 'NDA' | 'MSA'
export type UserRole = 'user' | 'assistant'
export type FeedbackRating = 'up' | 'down'
export type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'type'

export interface Contract {
  id: string
  name: string
  type: ContractType
  status: ContractStatus
  pageCount: number
  tokenCount: number | null
  createdAt: string
  lastAccessedAt: string
  signedUrl: string | null
  contractText: string
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
  confidenceScore: number
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

export type ContextType = 'CONTRACT' | 'HISTORY' | 'BOTH'

export interface ChatMessage {
  id: string
  role: UserRole
  content: string
  createdAt: string
  contextType?: ContextType
}

export interface UserFeedback {
  id: string
  contractId: string
  rating: FeedbackRating
  comment: string | null
  createdAt: string
}

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

export interface DashboardStats {
  total: number
  byType: { NDA: number; MSA: number }
}

export interface DashboardResponse {
  stats: DashboardStats
  contracts: DashboardContract[]
}

export interface FeedbackResponse {
  feedbackId: string
}

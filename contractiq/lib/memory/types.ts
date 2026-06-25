// Which source(s) the assistant should consult when answering
export type ContextType = 'CONTRACT' | 'HISTORY' | 'BOTH'

export interface ClassificationResult {
  type: ContextType
  // 'high' = unambiguous pattern match; 'low' = heuristic default
  confidence: 'high' | 'low'
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

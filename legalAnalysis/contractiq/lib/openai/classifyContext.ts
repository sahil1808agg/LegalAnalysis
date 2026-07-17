export type ContextType = 'CONTRACT' | 'HISTORY' | 'BOTH'

// Signals that the user is asking about what was said in this conversation
const HISTORY_PATTERNS = [
  /\bwhat did (you|i) (say|mention|tell|ask)\b/i,
  /\byou (said|mentioned|told|stated|answered)\b/i,
  /\bi (said|mentioned|asked|told you)\b/i,
  /\b(earlier|previously|before)\b/i,
  /\bjust (said|mentioned|told|asked)\b/i,
  /\byour (last|previous|prior|earlier) (answer|response|message|reply|explanation)\b/i,
  /\bmy (last|previous|prior|earlier) (question|message|request)\b/i,
  /\bwe (discussed|talked about|mentioned|covered)\b/i,
  /\bfrom (the )?(conversation|chat|our (talk|discussion|exchange))\b/i,
  /\bwhat (have|did) we (cover|discuss|talk about)\b/i,
  /\bin (your|the) (previous|last|prior|earlier) (answer|response|message|reply)\b/i,
  /\bbased on (your|what you) (said|mentioned|told|answered)\b/i,
  /\brecap\b/i,
  /\bsummariz(e|ing) (the|our|this) (conversation|chat|discussion)\b/i,
  /\bwhat (questions|topics) (have i|did i|we) (ask(ed)?|discuss(ed)?|cover(ed)?)\b/i,
]

// Signals that the user is asking about the contract document
const CONTRACT_PATTERNS = [
  /\b(contract|document|agreement|clause|section|page|article|exhibit|schedule|provision|paragraph)\b/i,
  /\bwhat does (it|the (contract|document|agreement)) (say|state|mention|specify|define)\b/i,
  /\bfind (the|a) (clause|section|term|provision|definition)\b/i,
  /\baccording to (the )?(contract|document|agreement)\b/i,
  /\bin the (contract|document|agreement)\b/i,
  /\b(termination|indemnity|liability|payment|notice|renewal|warranty|confidential|governing law)\b/i,
]

export function classifyContext(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): ContextType {
  if (history.length === 0) return 'CONTRACT'

  const hasHistorySignal = HISTORY_PATTERNS.some((p) => p.test(userMessage))
  const hasContractSignal = CONTRACT_PATTERNS.some((p) => p.test(userMessage))

  if (hasHistorySignal && hasContractSignal) return 'BOTH'
  if (hasHistorySignal) return 'HISTORY'
  return 'CONTRACT'
}

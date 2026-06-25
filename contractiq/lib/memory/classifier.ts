import { ClassificationResult, ConversationTurn } from './types'

// ─── Shared token groups ───────────────────────────────────────────────────

// Ordinal words and numbers that refer to a specific turn in a conversation
const ORDINAL = '(first|second|third|fourth|fifth|sixth|seventh|1st|2nd|3rd|4th|5th|6th|last|previous|prior|earlier|latest|recent|next)'

// Conversational objects
const CONV_OBJECT = '(question|message|thing|topic|reply|response|answer)'

// ─── HISTORY_ONLY patterns ─────────────────────────────────────────────────
// These questions are entirely about the conversation — no document lookup needed.
// Examples that should match:
//   "what did you just say?"
//   "what is the second question I ask?"
//   "what was my first question?"
//   "summarize our chat"
//   "how many questions have I asked?"
//   "list everything I've asked so far"

const HISTORY_ONLY: RegExp[] = [
  // "what did/have you/i say/ask/mention/tell"
  /\bwhat (did|have) (you|i) (said?|asked?|mentioned?|told)\b/i,

  // "what is/was/were [my|your|the] [ordinal] [question|message|...]"
  // covers: "what is the second question", "what was my first response"
  new RegExp(`\\b(what|which) (is|was|were) (my|your|the) ${ORDINAL} ${CONV_OBJECT}\\b`, 'i'),

  // "[my|your|the] [ordinal] question/message/..."
  // covers: "my second question", "the third thing I asked"
  new RegExp(`\\b(my|your|the) ${ORDINAL} ${CONV_OBJECT}\\b`, 'i'),

  // "[ordinal] question I ask/asked" (without possessive)
  // covers: "what is the second question I ask?"
  new RegExp(`\\b${ORDINAL} ${CONV_OBJECT} (i|i've) (asked?|said?|sent|posed|mentioned)\\b`, 'i'),

  // "[ordinal] question I ask?" — trailing verb at end of sentence
  // covers: "what is the second question I ask?"
  new RegExp(`${ORDINAL} ${CONV_OBJECT} i (ask|asked)\\b`, 'i'),

  // "question(s) i asked/ask/have asked"
  /\bquestions? (i|i've|i have) (asked?|sent|posed|raised)\b/i,
  /\bwhat (question|questions?) (did i|have i|do i|i) (ask|asked|pose|raised)\b/i,

  // "what was/were [my|the] [previous|last|earlier] [question|message|...]"
  new RegExp(`\\b(what|which) (was|were|is|are) (my|your|the) ${ORDINAL} (question|answer|${CONV_OBJECT})\\b`, 'i'),

  // recap / summarise / list the conversation
  /\b(recap|recaps?|summarize|summarise|list|show me|tell me) (our|this|the|your|all|everything (i've|i have|we've|we have)) (asked?|said?|questions?|messages?|conversation|discussion|chat|exchange|responses?|answers?)\b/i,

  // "how many questions/messages/times have i asked"
  /\bhow many (questions?|messages?|times|things?) (have i|did i|i have|we have|have we|i've) (asked?|said?|sent|mentioned?|discussed?)?\b/i,

  // "what have i / did i asked/said so far / already / today"
  /\bwhat (have i|did i) (asked?|said?|mentioned?) (so far|already|today|in this (chat|conversation|session))\b/i,

  // "what topics / things / subjects have we discussed"
  /\bwhat (topics?|things?|subjects?) (have we|did we) (covered?|discussed?|talked about|gone over|mentioned)\b/i,

  // "what were my previous questions / answers / messages"
  new RegExp(`\\bwhat (were|are) (my|your|the) ${ORDINAL}? ?(questions?|answers?|responses?|messages?)\\b`, 'i'),

  // "what did i ask [earlier|before|previously|first|at the start]"
  /\bwhat did i ask (earlier|before|previously|first|at the (start|beginning))\b/i,

  // "can you repeat / remind me what i asked"
  /\b(repeat|remind me|tell me again|say again) what (i|you) (asked?|said?|mentioned?)\b/i,
]

// ─── HISTORY_REFERENCE patterns ───────────────────────────────────────────
// Question references prior conversation but also needs contract facts.
// Examples:
//   "Based on what you said about the parties, are there exclusions?"
//   "You mentioned the governing law — what page is that on?"

const HISTORY_REFERENCE: RegExp[] = [
  /\b(as|like) you (said|mentioned|noted|explained|told me)\b/i,
  /\byou (mentioned|said|told me|noted|explained|pointed out) (earlier|before|previously|just|that|it)\b/i,
  /\bbased on (what you|your) (said|told|mentioned|explained|noted)\b/i,
  /\b(clarify|elaborate|expand|explain more|tell me more) (on |about )?(that|what you (just |previously )?said)\b/i,
  /\bgoing back to (what|the|that)\b/i,
  /\bearlier you (said|mentioned|told|explained|noted|pointed)\b/i,
  /\bfollow.?up (on|to|from) (what|that|your|the previous)\b/i,
  /\bin (your|the) previous (response|answer|message|reply)\b/i,
  /\bwhat you (just |previously )?(said|mentioned|explained|told me)\b/i,
  /\byour (last|previous|prior) (answer|response|message|reply) (said|mentioned|stated)\b/i,
]

// ─── Classifier ────────────────────────────────────────────────────────────

/**
 * Classifies whether a user question requires contract context, conversation
 * history, or both. Uses heuristic regex — no API call.
 *
 * Default: CONTRACT (safe for new document questions; history still injected
 * as message turns for conversational continuity).
 */
export function classifyQuery(
  question: string,
  history: ConversationTurn[]
): ClassificationResult {
  // No prior turns → only the document exists
  if (history.length === 0) {
    return { type: 'CONTRACT', confidence: 'high' }
  }

  if (HISTORY_ONLY.some((p) => p.test(question))) {
    return { type: 'HISTORY', confidence: 'high' }
  }

  if (HISTORY_REFERENCE.some((p) => p.test(question))) {
    return { type: 'BOTH', confidence: 'high' }
  }

  return { type: 'CONTRACT', confidence: 'low' }
}

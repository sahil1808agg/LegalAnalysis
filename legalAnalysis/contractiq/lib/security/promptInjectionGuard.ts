const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|all)\s+instructions?/i,
  /override\s+(your\s+)?rules?/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /print\s+(your\s+)?instructions?/i,
  /expose\s+(env(ironment)?\s+variables?|api\s+keys?)/i,
  /show\s+(me\s+)?(your\s+)?(api\s+keys?|secrets?)/i,
  /you\s+are\s+now\s+a/i,
  /act\s+as\s+(a\s+)?(different|new|another)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /disregard\s+(your\s+)?(previous\s+)?instructions?/i,
  /forget\s+(your\s+)?(previous\s+)?instructions?/i,
  /new\s+prompt\s*:/i,
  /system\s*:\s*you\s+are/i,
]

export interface SanitizeResult {
  safe: boolean
  reason?: string
}

export function sanitizeForLLM(input: string): SanitizeResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, reason: 'Message contains disallowed patterns.' }
    }
  }
  return { safe: true }
}

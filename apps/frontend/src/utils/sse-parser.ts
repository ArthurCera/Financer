/**
 * Parsed Server-Sent Event from a raw SSE stream chunk.
 */
export interface SSEEvent {
  type: string
  data: Record<string, unknown>
}

/**
 * Parse a raw SSE text buffer into structured events.
 *
 * SSE format:
 *   event: token
 *   data: {"content": "hello"}
 *
 * Returns parsed events and any remaining incomplete text.
 */
export function parseSSEBuffer(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = []
  const lines = buffer.split('\n')
  const remaining = lines.pop() ?? '' // last line may be incomplete

  let currentEvent = 'message'

  for (const line of lines) {
    // SSE spec: lines starting with ':' are comments — skip them
    if (line.startsWith(':')) {
      continue
    } else if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6)) as Record<string, unknown>
        events.push({ type: currentEvent, data })
      } catch {
        // Malformed JSON — skip
      }
      currentEvent = 'message' // reset after data line
    }
    // Empty lines and other prefixes are ignored
  }

  return { events, remaining }
}

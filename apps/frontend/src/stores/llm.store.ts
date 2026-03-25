import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { llmApi, unwrap, getAccessToken } from '../services/api.service'
import { extractErrorMessage } from '../utils/errors'
import { parseSSEBuffer, type SSEEvent } from '../utils/sse-parser'
import type {
  ChatHistoryResponse,
  CategorizeResponse,
  OCRResponse,
} from '@financer/shared'

const STREAM_URL =
  (import.meta.env.VITE_LLM_STREAM_URL as string | undefined) ?? 'http://localhost:3007'

const STREAM_TIMEOUT_MS = 60_000
const POLL_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 1500

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageStatus = 'sent' | 'pending' | 'streaming' | 'failed'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  status: MessageStatus
  error?: string
}

interface ChatJobResponse {
  jobId: string
}
interface ChatJobStatus {
  status: 'pending' | 'completed' | 'failed'
  reply?: { id: string; role: string; content: string; createdAt: string }
  error?: string
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLLMStore = defineStore('llm', () => {
  const messages = ref<DisplayMessage[]>([])
  const streamingContent = ref('')
  const toolCallStatus = ref<{ name: string; status: string } | null>(null)
  const error = ref<string | null>(null)
  const categorizingId = ref<string | null>(null)
  const categorizeBatchLoading = ref(false)
  const ocrLoading = ref(false)

  // Message send queue — messages are queued and processed one-at-a-time
  const sendQueue = ref<string[]>([])
  const processing = ref(false)

  // Active AbortController for SSE streaming — allows cleanup on unmount
  let activeController: AbortController | null = null

  const loading = computed(() => {
    return messages.value.some(
      (m) => m.status === 'pending' || m.status === 'streaming'
    )
  })

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  async function fetchHistory(): Promise<void> {
    error.value = null
    try {
      const result = unwrap<ChatHistoryResponse>(
        await llmApi.get<{ data: ChatHistoryResponse }>('/llm/chat/history')
      )
      messages.value = result.messages.map((m) => ({
        ...m,
        status: 'sent' as MessageStatus,
      }))
    } catch (err) {
      error.value = extractErrorMessage(err)
    }
  }

  // ---------------------------------------------------------------------------
  // Send — queues the message and processes sequentially
  // ---------------------------------------------------------------------------

  function sendMessage(text: string): void {
    // Add user message immediately (optimistic)
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    messages.value.push(userMsg)

    // Queue and process
    sendQueue.value.push(userMsg.id)
    processQueue()
  }

  /** Retry a failed message */
  function retryMessage(messageId: string): void {
    const msg = messages.value.find((m) => m.id === messageId)
    if (!msg || msg.status !== 'failed') return

    // Remove the failed assistant response if one was added
    const msgIdx = messages.value.indexOf(msg)
    const next = messages.value[msgIdx + 1]
    if (next?.role === 'assistant' && next.status === 'failed') {
      messages.value.splice(msgIdx + 1, 1)
    }

    // Reset user message status and re-queue
    msg.status = 'pending'
    msg.error = undefined
    sendQueue.value.push(msg.id)
    processQueue()
  }

  /** Dismiss a failed message */
  function dismissMessage(messageId: string): void {
    const msgIdx = messages.value.findIndex((m) => m.id === messageId)
    if (msgIdx === -1) return

    // Also remove paired assistant error if present
    const next = messages.value[msgIdx + 1]
    if (next?.role === 'assistant' && next.status === 'failed') {
      messages.value.splice(msgIdx, 2)
    } else {
      messages.value.splice(msgIdx, 1)
    }
  }

  async function processQueue(): Promise<void> {
    if (processing.value) return
    processing.value = true

    while (sendQueue.value.length > 0) {
      const msgId = sendQueue.value[0]!
      const msg = messages.value.find((m) => m.id === msgId)
      if (!msg) {
        sendQueue.value.shift()
        continue
      }

      error.value = null
      streamingContent.value = ''

      try {
        await sendViaStream(msg)
      } catch (streamErr) {
        // Fail fast on auth errors — don't bother with fallback
        const status = (streamErr as { status?: number })?.status
            ?? (streamErr as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 429) {
          msg.status = 'failed'
          msg.error = status === 429
            ? 'Rate limit exceeded. Try again in a minute.'
            : 'Session expired. Please log in again.'
          streamingContent.value = ''
          sendQueue.value.shift()
          continue
        }

        // Fall back to queue+poll for other errors
        try {
          await sendViaQueue(msg)
        } catch (err) {
          msg.status = 'failed'
          msg.error = extractErrorMessage(err)
        }
      }

      streamingContent.value = ''
      sendQueue.value.shift()
    }

    processing.value = false
  }

  // ---------------------------------------------------------------------------
  // SSE Streaming (primary)
  // ---------------------------------------------------------------------------

  async function sendViaStream(userMsg: DisplayMessage): Promise<void> {
    const token = getAccessToken()
    if (!token) throw new Error('Not authenticated')

    userMsg.status = 'streaming'

    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      activeController = controller
      const timeout = setTimeout(() => {
        controller.abort()
        reject(new Error('Request timed out'))
      }, STREAM_TIMEOUT_MS)

      fetch(`${STREAM_URL}/llm/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg.content }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            clearTimeout(timeout)
            const err = Object.assign(new Error(`Stream error: ${res.status}`), { status: res.status })
            reject(err)
            return
          }

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let fullContent = ''
          let buffer = ''
          let serverUserMessageId: string | undefined
          let serverAssistantMessageId: string | undefined

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const parsed = parseSSEBuffer(buffer)
            buffer = parsed.remaining

            const result = processSSEEvents(parsed.events, fullContent)
            fullContent = result.content
            if (result.userMessageId) serverUserMessageId = result.userMessageId
            if (result.assistantMessageId) serverAssistantMessageId = result.assistantMessageId
          }

          clearTimeout(timeout)
          activeController = null

          if (fullContent) {
            // Reconcile user message ID with server ID
            if (serverUserMessageId) {
              userMsg.id = serverUserMessageId
            }
            userMsg.status = 'sent'

            messages.value.push({
              id: serverAssistantMessageId ?? `ast-${Date.now()}`,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
              status: 'sent',
            })
            resolve()
          } else {
            reject(new Error('Empty response from assistant'))
          }
        })
        .catch((err) => {
          clearTimeout(timeout)
          activeController = null
          reject(err)
        })
    })
  }

  interface SSEProcessResult {
    content: string
    userMessageId?: string
    assistantMessageId?: string
  }

  /** Process parsed SSE events and return updated content + server message IDs */
  function processSSEEvents(events: SSEEvent[], content: string): SSEProcessResult {
    let result = content
    let userMessageId: string | undefined
    let assistantMessageId: string | undefined

    for (const event of events) {
      const c = event.data.content
      switch (event.type) {
        case 'token':
          if (typeof c === 'string') {
            result += c
            streamingContent.value = result
          }
          break
        case 'done':
          if (typeof c === 'string') result = c
          if (typeof event.data.userMessageId === 'string') {
            userMessageId = event.data.userMessageId
          }
          if (typeof event.data.assistantMessageId === 'string') {
            assistantMessageId = event.data.assistantMessageId
          }
          toolCallStatus.value = null
          break
        case 'tool_call':
          toolCallStatus.value = {
            name: event.data.name as string,
            status: (event.data.status as string) ?? 'executing',
          }
          break
        case 'tool_result':
          toolCallStatus.value = null
          break
        case 'stream_reset':
          // New streaming pass after tool call — reset token buffer
          result = ''
          streamingContent.value = ''
          break
        case 'error':
          console.warn('[LLM] Stream error event:', event.data.error)
          break
        case 'fallback':
          if (typeof c === 'string') result = c
          break
        default:
          if (typeof c === 'string' && !event.data.error) {
            result += c
            streamingContent.value = result
          }
      }
    }
    return { content: result, userMessageId, assistantMessageId }
  }

  /** Abort any active streaming connection (call on component unmount) */
  function cleanup(): void {
    if (activeController) {
      activeController.abort()
      activeController = null
    }
    streamingContent.value = ''
    toolCallStatus.value = null
  }

  // ---------------------------------------------------------------------------
  // Queue + Poll (fallback)
  // ---------------------------------------------------------------------------

  async function sendViaQueue(userMsg: DisplayMessage): Promise<void> {
    userMsg.status = 'pending'

    const submitRes = unwrap<ChatJobResponse>(
      await llmApi.post<{ data: ChatJobResponse }>('/llm/chat', {
        message: userMsg.content,
      })
    )

    const result = await pollChatJob(submitRes.jobId)

    if (result.status === 'completed' && result.reply) {
      userMsg.status = 'sent'
      messages.value.push({
        id: result.reply.id,
        role: result.reply.role as 'user' | 'assistant',
        content: result.reply.content,
        createdAt: result.reply.createdAt,
        status: 'sent',
      })
    } else {
      throw new Error(result.error ?? 'Chat request failed')
    }
  }

  async function pollChatJob(jobId: string): Promise<ChatJobStatus> {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    let consecutiveErrors = 0
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      try {
        const res = unwrap<ChatJobStatus>(
          await llmApi.get<{ data: ChatJobStatus }>(`/llm/chat/job/${jobId}`)
        )
        consecutiveErrors = 0
        if (res.status !== 'pending') return res
      } catch {
        consecutiveErrors++
        if (consecutiveErrors >= 3) {
          return { status: 'failed', error: 'Unable to reach server. Please try again.' }
        }
      }
    }
    return { status: 'failed', error: 'Request timed out. Please try again.' }
  }

  // ---------------------------------------------------------------------------
  // Other LLM features
  // ---------------------------------------------------------------------------

  async function categorizeExpense(
    expenseId: string
  ): Promise<CategorizeResponse | null> {
    categorizingId.value = expenseId
    error.value = null
    try {
      return unwrap<CategorizeResponse>(
        await llmApi.post<{ data: CategorizeResponse }>('/llm/categorize', {
          expenseId,
        })
      )
    } catch (err) {
      error.value = extractErrorMessage(err)
      return null
    } finally {
      categorizingId.value = null
    }
  }

  async function categorizeBatch(
    month: number,
    year: number
  ): Promise<boolean> {
    categorizeBatchLoading.value = true
    error.value = null
    try {
      await llmApi.post('/llm/categorize-batch', { month, year })
      return true
    } catch (err) {
      error.value = extractErrorMessage(err)
      return false
    } finally {
      categorizeBatchLoading.value = false
    }
  }

  async function uploadReceipt(
    imageBase64: string,
    mimeType?: string
  ): Promise<OCRResponse | null> {
    ocrLoading.value = true
    error.value = null
    try {
      return unwrap<OCRResponse>(
        await llmApi.post<{ data: OCRResponse }>('/llm/ocr', {
          imageBase64,
          mimeType,
        })
      )
    } catch (err) {
      error.value = extractErrorMessage(err)
      return null
    } finally {
      ocrLoading.value = false
    }
  }

  return {
    messages,
    loading,
    error,
    streamingContent,
    toolCallStatus,
    categorizingId,
    categorizeBatchLoading,
    ocrLoading,
    fetchHistory,
    sendMessage,
    retryMessage,
    dismissMessage,
    categorizeExpense,
    categorizeBatch,
    uploadReceipt,
    cleanup,
  }
})


import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { llmApi, unwrap } from '../services/api.service'
import { extractErrorMessage } from '../utils/errors'
import type {
  ChatHistoryResponse,
  CategorizeResponse,
  CategorizeBatchResult,
  ChatMessage,
  OCRResponse,
} from '@financer/shared'

const CHAT_TIMEOUT_MS = 120_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageStatus = 'sent' | 'pending' | 'failed'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  status: MessageStatus
  error?: string
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLLMStore = defineStore('llm', () => {
  const messages = ref<DisplayMessage[]>([])
  const error = ref<string | null>(null)
  const categorizingId = ref<string | null>(null)
  const categorizeBatchLoading = ref(false)
  const ocrLoading = ref(false)
  const historyLoaded = ref(false)

  // Message send queue — messages are queued and processed one-at-a-time
  const sendQueue = ref<string[]>([])
  const processing = ref(false)

  const loading = computed(() => {
    return messages.value.some((m) => m.status === 'pending')
  })

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  async function fetchHistory(): Promise<void> {
    if (historyLoaded.value) return
    historyLoaded.value = true
    error.value = null
    try {
      const result = unwrap<ChatHistoryResponse>(
        await llmApi.get<{ data: ChatHistoryResponse }>('/llm/chat/history')
      )
      // Only load history if there are no in-flight messages (avoid wiping pending state)
      const hasPending = messages.value.some((m) => m.status === 'pending')
      if (!hasPending) {
        messages.value = result.messages.map((m) => ({
          ...m,
          status: 'sent' as MessageStatus,
        }))
      }
    } catch (err) {
      error.value = extractErrorMessage(err)
    }
  }

  // ---------------------------------------------------------------------------
  // Send — queues the message and processes sequentially
  // ---------------------------------------------------------------------------

  function sendMessage(text: string): void {
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    messages.value.push(userMsg)

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

    msg.status = 'pending'
    msg.error = undefined
    sendQueue.value.push(msg.id)
    processQueue()
  }

  /** Dismiss a failed message */
  function dismissMessage(messageId: string): void {
    const msgIdx = messages.value.findIndex((m) => m.id === messageId)
    if (msgIdx === -1) return

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

      try {
        msg.status = 'pending'
        const result = unwrap<ChatMessage>(
          await llmApi.post<{ data: ChatMessage }>(
            '/llm/chat',
            { message: msg.content },
            { timeout: CHAT_TIMEOUT_MS },
          )
        )
        msg.status = 'sent'
        messages.value.push({
          id: result.id,
          role: 'assistant',
          content: result.content,
          createdAt: result.createdAt,
          status: 'sent',
        })
      } catch (err) {
        msg.status = 'failed'
        msg.error = extractErrorMessage(err)
      }

      sendQueue.value.shift()
    }

    processing.value = false
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
    year: number,
    recategorizeAll = false,
  ): Promise<CategorizeBatchResult | null> {
    categorizeBatchLoading.value = true
    error.value = null
    try {
      const result = unwrap<CategorizeBatchResult>(
        await llmApi.post<{ data: CategorizeBatchResult }>(
          '/llm/categorize-batch',
          { month, year, recategorizeAll },
          { timeout: 120_000 },
        )
      )
      return result
    } catch (err) {
      error.value = extractErrorMessage(err)
      return null
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

  function resetForAccountSwitch(): void {
    messages.value = []
    historyLoaded.value = false
    error.value = null
  }

  return {
    messages,
    loading,
    error,
    categorizingId,
    categorizeBatchLoading,
    ocrLoading,
    historyLoaded,
    fetchHistory,
    sendMessage,
    retryMessage,
    dismissMessage,
    categorizeExpense,
    categorizeBatch,
    uploadReceipt,
    resetForAccountSwitch,
  }
})

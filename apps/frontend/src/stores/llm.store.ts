import { defineStore } from 'pinia'
import { ref } from 'vue'
import { llmApi, unwrap } from '../services/api.service'
import type {
  ChatMessage,
  ChatResponse,
  ChatHistoryResponse,
  CategorizeResponse,
  OCRResponse,
} from '@financer/shared'

export const useLLMStore = defineStore('llm', () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const categorizingId = ref<string | null>(null)
  const categorizeBatchLoading = ref(false)
  const ocrLoading = ref(false)

  async function fetchHistory(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = unwrap<ChatHistoryResponse>(
        await llmApi.get<{ data: ChatHistoryResponse }>('/llm/chat/history')
      )
      messages.value = result.messages
    } catch (err) {
      error.value = extractMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(text: string): Promise<void> {
    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(userMsg)

    loading.value = true
    error.value = null
    try {
      const result = unwrap<ChatResponse>(
        await llmApi.post<{ data: ChatResponse }>('/llm/chat', { message: text })
      )
      // Replace temp user message with server version and add reply
      messages.value[messages.value.length - 1] = {
        ...userMsg,
        id: result.reply.id.replace('assistant', 'user'), // approximation
      }
      messages.value.push(result.reply)
    } catch (err) {
      error.value = extractMessage(err)
      // Remove optimistic message on failure
      messages.value.pop()
    } finally {
      loading.value = false
    }
  }

  async function categorizeExpense(expenseId: string): Promise<CategorizeResponse | null> {
    categorizingId.value = expenseId
    error.value = null
    try {
      const result = unwrap<CategorizeResponse>(
        await llmApi.post<{ data: CategorizeResponse }>('/llm/categorize', { expenseId })
      )
      return result
    } catch (err) {
      error.value = extractMessage(err)
      return null
    } finally {
      categorizingId.value = null
    }
  }

  async function categorizeBatch(month: number, year: number): Promise<boolean> {
    categorizeBatchLoading.value = true
    error.value = null
    try {
      await llmApi.post('/llm/categorize-batch', { month, year })
      return true
    } catch (err) {
      error.value = extractMessage(err)
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
      const result = unwrap<OCRResponse>(
        await llmApi.post<{ data: OCRResponse }>('/llm/ocr', { imageBase64, mimeType })
      )
      return result
    } catch (err) {
      error.value = extractMessage(err)
      return null
    } finally {
      ocrLoading.value = false
    }
  }

  return {
    messages,
    loading,
    error,
    categorizingId,
    categorizeBatchLoading,
    ocrLoading,
    fetchHistory,
    sendMessage,
    categorizeExpense,
    categorizeBatch,
    uploadReceipt,
  }
})

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}

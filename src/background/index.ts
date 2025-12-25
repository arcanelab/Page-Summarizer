/**
 * Background script - handles LLM requests and message routing
 */

import { browser, messaging, tabs } from '@/shared/browser-api'
import {
  AnalysisMessage,
  ResultMessage,
  ErrorMessage,
  PageContent,
  ExtensionMessage,
} from '@/shared/types'
import { getLLMConfig, getIncludeImages, initializeDefaultSettings, getPromptTemplate } from './storage'
import { createLLMService } from './llm-service'

const resultPorts = new Map<number, chrome.runtime.Port>()
const portToWindowId = new Map<chrome.runtime.Port, number>()
const messageQueues = new Map<number, any[]>()

function queueMessageToResultsWindow(windowId: number | undefined, message: any) {
  if (!windowId) return

  const port = resultPorts.get(windowId)
  if (port) {
    port.postMessage(message)
  } else {
    if (!messageQueues.has(windowId)) {
      messageQueues.set(windowId, [])
    }
    messageQueues.get(windowId)!.push(message)
  }
}

function registerResultsPort(windowId: number, port: chrome.runtime.Port) {
  const existingWindowId = portToWindowId.get(port)
  if (existingWindowId !== undefined) {
    if (existingWindowId === windowId) {
      return
    }
    console.warn(
      '[LLM] Port already registered with window:',
      existingWindowId,
      'ignoring new windowId:',
      windowId
    )
    return
  }

  resultPorts.set(windowId, port)
  portToWindowId.set(port, windowId)
  console.log('[LLM] Results window registered:', windowId)

  const queue = messageQueues.get(windowId)
  if (queue?.length) {
    queue.forEach((queuedMsg) => port.postMessage(queuedMsg))
    messageQueues.delete(windowId)
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'results-window') return

  console.log('[LLM] Results window port connected')

  const inferredWindowId = port.sender?.tab?.windowId
  if (typeof inferredWindowId === 'number') {
    registerResultsPort(inferredWindowId, port)
  } else {
    console.warn('[LLM] Could not infer windowId from port sender; waiting for register message')
  }

  port.onMessage.addListener((msg) => {
    if (msg.type === 'ping') {
      // Keep-alive ping received
      return
    }
    if (msg.type === 'register' && typeof msg.windowId === 'number') {
      registerResultsPort(msg.windowId, port)
    } else if (msg.type === 'retry' && typeof msg.windowId === 'number') {
      // Retry functionality can be added later
      console.log('[LLM] Retry requested for window:', msg.windowId)
    }
  })

  port.onDisconnect.addListener(() => {
    const windowId = portToWindowId.get(port)
    if (windowId !== undefined) {
      console.log('[LLM] Results window disconnected:', windowId)
      resultPorts.delete(windowId)
      messageQueues.delete(windowId)
      portToWindowId.delete(port)
    }
  })
})

// Initialize settings on installation
browser.runtime.onInstalled.addListener(async () => {
  await initializeDefaultSettings()
  console.log('Extension installed and initialized')
})

// Handle messages from content script and popup
browser.runtime.onMessage.addListener(
  (
    request: ExtensionMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> | undefined => {
    if (request.action === 'analyzePage') {
      return handleAnalyzeRequest(request as AnalysisMessage, sender)
    }

    if (request.action === 'analyzePageWithWindow') {
      handleAnalyzeWithWindow(request as any, sender).catch((err) =>
        console.error('Unhandled error in analyzeWithWindow:', err)
      )
      return Promise.resolve()
    }

    if (request.action === 'getSettings') {
      return handleGetSettings()
    }

    console.warn('Unknown action:', request.action)
    return undefined
  }
)

async function handleAnalyzeWithWindow(
  request: { action: string; tabId: number },
  sender: chrome.runtime.MessageSender
): Promise<void> {
  console.log('[LLM] Analyze with window request for tab:', request.tabId)

  let resultsWindowId: number | undefined

  try {
    // Create results window
    const baseResultsUrl = chrome.runtime.getURL('results.html')

    const resultsWindow = await chrome.windows.create({
      url: baseResultsUrl,
      type: 'popup',
      width: 700,
      height: 600,
    })

    resultsWindowId = resultsWindow.id

    if (!resultsWindowId) {
      throw new Error('Could not create results window')
    }

    console.log('[LLM] Results window created, ID:', resultsWindowId)

    // Queue initial status
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'updateStatus',
      status: 'Extracting page content...',
    })

    // Get page content from tab
    let pageContent
    try {
      pageContent = await chrome.tabs.sendMessage(request.tabId, { action: 'getPageContent' })
      console.log('[LLM] Received page content, text length:', pageContent?.text?.length)
    } catch (contentError) {
      console.error('[LLM] Content extraction failed:', contentError)
      queueMessageToResultsWindow(resultsWindowId, {
        action: 'error',
        error: 'Could not extract page content. Try refreshing the page.',
      })
      return
    }

    if (!pageContent || !pageContent.text) {
      queueMessageToResultsWindow(resultsWindowId, {
        action: 'error',
        error: 'Invalid page content received',
      })
      return
    }

    // Now analyze
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'updateStatus',
      status: 'Sending to LLM server...',
    })

    const config = await getLLMConfig()
    const includeImages = await getIncludeImages()
    
    // Filter images if not enabled
    if (!includeImages && pageContent) {
      pageContent.images = []
    }

    console.log('[LLM] LLM Config:', config.type, config.model)
    
    const service = createLLMService(config)
    const promptTemplate = await getPromptTemplate()
    const result = await service.analyze(pageContent, promptTemplate, includeImages)

    console.log(`[LLM] Success! Analysis length: ${result.analysis.length} chars`)

    // Send result
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'result',
      result: {
        analysis: result.analysis,
        timestamp: Date.now(),
        provider: result.provider,
        model: result.model,
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[LLM] Analysis failed:', errorMsg)
    
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'error',
      error: errorMsg,
    })
  }
}

async function handleAnalyzeRequest(
  request: AnalysisMessage & { resultsWindowId?: number },
  sender: chrome.runtime.MessageSender
): Promise<ResultMessage | ErrorMessage> {
  const resultsWindowId = request.resultsWindowId
  console.log('[LLM] Analysis request received, results window ID:', resultsWindowId)
  console.log('[LLM] Request payload:', JSON.stringify(request, null, 2))

  try {
    const content = request.content as PageContent

    // Validate content
    if (!content || !content.text) {
      throw new Error('Invalid page content received')
    }

    console.log('[LLM] Content validated, text length:', content.text.length)

    // Send status: Extracting content
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'updateStatus',
      status: 'Extracting page content...',
    })

    const config = await getLLMConfig()
    const includeImages = await getIncludeImages()

    // Filter images if not enabled
    if (!includeImages && content) {
      content.images = []
    }

    console.log('[LLM] LLM Config:', JSON.stringify(config, null, 2))
    
    const service = createLLMService(config)

    console.log(`[LLM] Analyzing with ${config.type} provider...`)
    console.log(`[LLM] Model: ${(config as any).model}`)
    console.log(`[LLM] Prompt length: ${content.text.length} chars`)

    // Send status: Sending to LLM
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'updateStatus',
      status: 'Sending to LLM server...',
    })

    const promptTemplate = await getPromptTemplate()

    const result = await service.analyze(content, promptTemplate, includeImages)

    const response: ResultMessage = {
      action: 'result',
      result: {
        analysis: result.analysis,
        timestamp: Date.now(),
        provider: result.provider,
        model: result.model,
      },
    }

    console.log(`[LLM] Success! Analysis length: ${result.analysis.length} chars`)

    // Send result to results window
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'result',
      result: response.result,
    })

    return response
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[LLM] Analysis failed:', errorMsg)

    const errorMessage: ErrorMessage = {
      action: 'error',
      error: errorMsg,
    }

    // Send error to results window
    queueMessageToResultsWindow(resultsWindowId, {
      action: 'error',
      error: errorMsg,
    })

    return errorMessage
  }
}

async function handleGetSettings() {
  try {
    const config = await getLLMConfig()
    const includeImages = await getIncludeImages()
    const promptTemplate = await getPromptTemplate()

    return {
      provider: config.type,
      model: (config as any).model,
      includeImages,
      promptTemplate,
    }
  } catch (error) {
    console.error('Failed to get settings:', error)
    return null
  }
}

// Listen for storage changes to update configuration
browser.storage.onChanged.addListener((changes) => {
  if ('llmConfig' in changes || 'analysisSettings' in changes) {
    console.log('Settings updated', changes)
  }
})

console.log('Background script loaded')

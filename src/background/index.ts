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
import { getLLMConfig, getIncludeImages, initializeDefaultSettings } from './storage'
import { createLLMService } from './llm-service'

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

    if (request.action === 'getSettings') {
      return handleGetSettings()
    }

    console.warn('Unknown action:', request.action)
    return undefined
  }
)

async function handleAnalyzeRequest(
  request: AnalysisMessage,
  sender: chrome.runtime.MessageSender
): Promise<ResultMessage | ErrorMessage> {
  try {
    console.log('Received analyze request from tab', sender.tab?.id)

    const content = request.content as PageContent
    const config = await getLLMConfig()
    const service = createLLMService(config)

    console.log(`Analyzing with ${config.type} provider...`)

    const result = await service.analyze(content)

    const response: ResultMessage = {
      action: 'result',
      result: {
        analysis: result.analysis,
        timestamp: Date.now(),
        provider: result.provider,
        model: result.model,
      },
    }

    // Send result back to the content script in the tab
    if (sender.tab?.id) {
      await browser.tabs.sendMessage(sender.tab.id, response)
    }

    return response
  } catch (error) {
    const errorMessage: ErrorMessage = {
      action: 'error',
      error: error instanceof Error ? error.message : String(error),
    }

    // Send error back to the content script
    if (sender.tab?.id) {
      try {
        await browser.tabs.sendMessage(sender.tab.id, errorMessage)
      } catch (e) {
        console.error('Failed to send error message to content script:', e)
      }
    }

    console.error('Analysis failed:', error)
    return errorMessage
  }
}

async function handleGetSettings() {
  try {
    const config = await getLLMConfig()
    const includeImages = await getIncludeImages()

    return {
      provider: config.type,
      model: (config as any).model,
      includeImages,
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

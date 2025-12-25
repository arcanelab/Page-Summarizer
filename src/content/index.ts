/**
 * Content script - runs on every page and handles page extraction
 */

import { messaging } from '@/shared/browser-api'
import { PageContent, AnalysisMessage, ResultMessage, ErrorMessage } from '@/shared/types'
import { extractImages, extractMainContent, sanitizeText, truncateText } from '@/shared/utils'

console.log('Content script: Loading...')

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(
  (
    request: { action: string },
    sender,
    sendResponse
  ) => {
    console.log('Content script: Received message:', request.action)
    
    if (request.action === 'getPageContent') {
      // Fetch settings first to get the configured maxPageChars
      ;(async () => {
        try {
          console.log('Content script: Extracting page content...')
          const settings = await chrome.runtime.sendMessage({ action: 'getSettings' })
          const maxLength = settings?.maxPageChars ? Number(settings.maxPageChars) : 8000
          const content = getPageContent(maxLength)
          console.log('Content script: Extracted content, text length:', content.text.length, 'images:', content.images.length)
          sendResponse(content)
        } catch (error) {
          console.error('Content script: Error getting page content:', error)
          sendResponse({ error: error instanceof Error ? error.message : String(error) })
        }
      })()
      return true // Keep the message channel open for async response
    } else if (request.action === 'result') {
      displayResult(request as ResultMessage)
      sendResponse({ status: 'ok' })
      return true
    } else if (request.action === 'error') {
      displayError(request as ErrorMessage)
      sendResponse({ status: 'ok' })
      return true
    } else {
      console.warn('Content script: Unknown action:', request.action)
      sendResponse({ error: 'Unknown action' })
      return true
    }
  }
)

console.log('Content script: Message listener registered')

function getPageContent(maxLength = 8000): PageContent {
  // Extract main text content
  let text = extractMainContent()
  text = sanitizeText(text)

  // Limit text length to avoid overwhelming the LLM
  text = truncateText(text, maxLength)

  // Extract images
  const images = extractImages(5) // Max 5 images

  return {
    text,
    images,
  }
}

function displayResult(message: ResultMessage) {
  const result = message.result

  // Create a simple notification or log the result
  console.log('Analysis result:', result.analysis)

  // You can enhance this with a visual notification later
  const notificationDiv = createNotificationElement('analysis-result', result.analysis)
  document.body.appendChild(notificationDiv)

  // Auto-remove after 30 seconds
  setTimeout(() => {
    notificationDiv.remove()
  }, 30000)
}

function displayError(message: ErrorMessage) {
  console.error('Analysis error:', message.error)

  const errorDiv = createNotificationElement(
    'analysis-error',
    `Error: ${message.error}`,
    'error'
  )
  document.body.appendChild(errorDiv)

  setTimeout(() => {
    errorDiv.remove()
  }, 10000)
}

function createNotificationElement(
  id: string,
  content: string,
  type: 'success' | 'error' = 'success'
): HTMLDivElement {
  const div = document.createElement('div')
  div.id = id
  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 20px;
    background-color: ${type === 'error' ? '#f87171' : '#34d399'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    max-width: 400px;
    word-wrap: break-word;
  `

  // Use textContent for notifications to avoid injecting HTML
  div.textContent = content

  return div
}

console.log('Content script loaded')

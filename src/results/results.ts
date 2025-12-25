/**
 * Results page - displays analysis results in a dedicated window
 */

import { AnalysisResult } from '@/shared/types'
import { marked } from 'marked'

const statusSection = document.getElementById('status-section')!
const resultSection = document.getElementById('result-section')!
const errorSection = document.getElementById('error-section')!
const statusText = document.getElementById('status-text')!
const resultContent = document.getElementById('result-content')!
const resultProvider = document.getElementById('result-provider')!
const errorText = document.getElementById('error-text')!
const copyBtn = document.getElementById('copy-btn')!
const retryBtn = document.getElementById('retry-btn')!

let currentResult: AnalysisResult | null = null
let currentError: string | null = null

const port = chrome.runtime.connect({ name: 'results-window' })

function getCurrentWindow(): Promise<chrome.windows.Window> {
  return new Promise((resolve) => chrome.windows.getCurrent(resolve))
}

async function registerWindow() {
  try {
    const currentWindow = await getCurrentWindow()
    console.log('Current window object:', currentWindow)
    if (!currentWindow.id) {
      throw new Error('Could not determine window ID')
    }

    port.postMessage({ type: 'register', windowId: currentWindow.id })
    console.log('Results page registered with background, windowId:', currentWindow.id)
  } catch (error) {
    console.error('Failed to register results window:', error)
    showError('Could not connect to background process. Please close and try again.')
  }
}

registerWindow()

// Copy result to clipboard
copyBtn.addEventListener('click', async () => {
  if (currentResult) {
    try {
      await navigator.clipboard.writeText(currentResult.analysis)
      copyBtn.textContent = 'Copied!'
      copyBtn.classList.add('success')
      setTimeout(() => {
        copyBtn.textContent = 'Copy'
        copyBtn.classList.remove('success')
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }
})

// Retry button
retryBtn.addEventListener('click', () => {
  getCurrentWindow().then((currentWindow) => {
    if (currentWindow.id) {
      port.postMessage({ type: 'retry', windowId: currentWindow.id })
    }
  })
})

// Update status
function setStatus(text: string) {
  statusText.textContent = text
}

// Show result
function showResult(result: AnalysisResult) {
  currentResult = result
  statusSection.style.display = 'none'
  errorSection.style.display = 'none'
  resultSection.style.display = 'block'

  resultProvider.textContent = `${result.provider.toUpperCase()} • ${result.model}`
  // Sanitize HTML produced by `marked` before inserting into the DOM
  const rawHtml = marked.parse(result.analysis) as string
  appendSanitizedHtml(resultContent, rawHtml)
}
// Parse HTML, remove unsafe elements/attributes, and append safe nodes to `container`.
function appendSanitizedHtml(container: Element, html: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const forbiddenTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'])

  function sanitizeNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (forbiddenTags.has(tag)) {
        el.remove()
        return
      }

      // Remove event handlers and javascript: URIs
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase()
        const value = attr.value || ''
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name)
        }
        if ((name === 'href' || name === 'src') && value.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr.name)
        }
      })
    }

    // Recurse safely over a static copy of child nodes
    Array.from(node.childNodes).forEach((child) => sanitizeNode(child))
  }

  // Clear existing content
  while (container.firstChild) container.removeChild(container.firstChild)

  // Import and sanitize children from parsed document
  Array.from(doc.body.childNodes).forEach((child) => {
    const imported = document.importNode(child, true)
    sanitizeNode(imported)
    container.appendChild(imported)
  })
}

// Show error
function showError(error: string) {
  currentError = error
  statusSection.style.display = 'none'
  resultSection.style.display = 'none'
  errorSection.style.display = 'block'
  errorText.textContent = error
}

// Listen for messages from background script via port
port.onMessage.addListener((request) => {
  if (request.action === 'ping') {
    // Respond to keep-alive ping if needed, or just ignore
    return
  }
  if (request.action === 'updateStatus') {
    setStatus(request.status)
  } else if (request.action === 'result') {
    const result = request.result as AnalysisResult
    showResult(result)
  } else if (request.action === 'error') {
    const error = request.error as string
    showError(error)
  }
})

// Keep-alive heartbeat
const heartbeatInterval = setInterval(() => {
  try {
    port.postMessage({ type: 'ping' })
  } catch (e) {
    console.error('Failed to send heartbeat:', e)
    clearInterval(heartbeatInterval)
  }
}, 5000)

port.onDisconnect.addListener(() => {
  clearInterval(heartbeatInterval)
  if (chrome.runtime.lastError) {
    console.error('Port disconnected due to error:', chrome.runtime.lastError)
  }
  if (!currentResult && !currentError) {
    showError('Results window disconnected. Please try analyzing again.')
  }
})

console.log('Results page loaded')

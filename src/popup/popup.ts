/**
 * Popup UI - main entry point for user interaction
 */

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement
  const statusDiv = document.getElementById('status') as HTMLDivElement
  const resultDiv = document.getElementById('result') as HTMLDivElement
  const settingsLink = document.getElementById('settings-link') as HTMLAnchorElement

  analyzeBtn.addEventListener('click', handleAnalyze)
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
    window.close()
  })

  // Load initial status
  loadSettings()
})

async function handleAnalyze() {
  const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement
  const statusDiv = document.getElementById('status') as HTMLDivElement
  const resultDiv = document.getElementById('result') as HTMLDivElement

  analyzeBtn.disabled = true
  analyzeBtn.textContent = 'Analyzing...'
  statusDiv.textContent = 'Extracting page content...'
  resultDiv.innerHTML = ''

  try {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tabs[0]?.id) throw new Error('Could not identify current tab')

    const tabId = tabs[0].id

    // Request page content from content script
    const pageContent = await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' })

    statusDiv.textContent = 'Sending to LLM...'

    // Send analysis request to background script
    const result = await chrome.runtime.sendMessage({
      action: 'analyzePage',
      content: pageContent,
    })

    if (result.action === 'error') {
      throw new Error(result.error)
    }

    // Display result
    displayResult(result)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    statusDiv.textContent = `Error: ${errorMsg}`
    statusDiv.style.color = '#ef4444'
  } finally {
    analyzeBtn.disabled = false
    analyzeBtn.textContent = 'Analyze Page'
  }
}

function displayResult(message: any) {
  const resultDiv = document.getElementById('result') as HTMLDivElement
  const statusDiv = document.getElementById('status') as HTMLDivElement

  if (message.action === 'error') {
    statusDiv.textContent = `Error: ${message.error}`
    statusDiv.style.color = '#ef4444'
    return
  }

  const result = message.result
  resultDiv.innerHTML = `
    <div style="margin-top: 12px; padding: 12px; background-color: #f3f4f6; border-radius: 6px;">
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
        ${result.provider.toUpperCase()} • ${result.model}
      </div>
      <div style="font-size: 13px; line-height: 1.5; color: #1f2937;">
        ${escapeHtml(result.analysis)}
      </div>
    </div>
  `
  statusDiv.textContent = 'Done!'
  statusDiv.style.color = '#059669'
}

async function loadSettings() {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getSettings' })
    const settingsLink = document.getElementById('settings-link') as HTMLAnchorElement
    settingsLink.textContent = `Settings (${result.provider})`
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

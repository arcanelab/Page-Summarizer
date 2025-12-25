/**
 * Popup UI - main entry point for user interaction
 */

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement
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

  analyzeBtn.disabled = true
  analyzeBtn.textContent = 'Summarizing...'

  try {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    console.log('Popup: Found tabs:', tabs.length, tabs[0])
    
    if (!tabs[0]?.id) throw new Error('Could not identify current tab')

    const tabId = tabs[0].id
    console.log('Popup: Requesting analysis for tab', tabId)

    // Send analyze request to background - it will handle window creation and content extraction
    await chrome.runtime.sendMessage({
      action: 'analyzePageWithWindow',
      tabId: tabId,
    })
    
    console.log('Popup: Analysis request sent to background')
    
    // Close popup after a short delay
    setTimeout(() => {
      window.close()
    }, 100)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Popup: Analysis error:', errorMsg)
    alert(`Error: ${errorMsg}`)
  } finally {
    analyzeBtn.disabled = false
    analyzeBtn.textContent = 'Summarize Page'
  }
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

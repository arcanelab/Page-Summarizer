/**
 * Options page script - handles configuration UI
 */

import { getLLMConfig, setLLMConfig, getIncludeImages, setIncludeImages, getPromptTemplate, setPromptTemplate, DEFAULT_PROMPT } from '@/background/storage'
import { LLMConfig } from '@/shared/types'

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('provider') as HTMLSelectElement
  const endpointInput = document.getElementById('endpoint') as HTMLInputElement
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement
  const modelInput = document.getElementById('model') as HTMLInputElement
  const temperatureInput = document.getElementById('temperature') as HTMLInputElement
  const temperatureValue = document.getElementById('temperature-value') as HTMLSpanElement
  const includeImagesCheckbox = document.getElementById('include-images') as HTMLInputElement
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement
  const testBtn = document.getElementById('test-btn') as HTMLButtonElement
  const statusDiv = document.getElementById('status') as HTMLDivElement
  const buildVersionSpan = document.getElementById('build-version') as HTMLSpanElement

  // Set build version
  const buildDate = new Date().toISOString().replace('T', ' ').substring(0, 19)
  buildVersionSpan.textContent = buildDate

  // Load current settings
  const config = await getLLMConfig()
  const includeImages = await getIncludeImages()
  const promptTemplate = await getPromptTemplate()

  const promptTextarea = document.getElementById('prompt-template') as HTMLTextAreaElement
  const restorePromptBtn = document.getElementById('restore-default-prompt') as HTMLButtonElement
  const previewPre = document.getElementById('prompt-preview') as HTMLPreElement
  const previewBtn = document.getElementById('preview-prompt-btn') as HTMLButtonElement

  providerSelect.value = config.type
  modelInput.value = (config as any).model || 'llama2'
  temperatureInput.value = String(config.temperature || 0.7)
  temperatureValue.textContent = String(config.temperature || 0.7)
  includeImagesCheckbox.checked = includeImages
  promptTextarea.value = promptTemplate
  previewPre.textContent = promptTemplate

  if (config.type === 'ollama' || config.type === 'lm-studio') {
    endpointInput.value = (config as any).endpoint || 'http://localhost:11434/api/generate'
    endpointInput.style.display = 'block'
    apiKeyInput.style.display = 'none'
  } else {
    apiKeyInput.value = (config as any).apiKey || ''
    apiKeyInput.style.display = 'block'
    endpointInput.style.display = 'none'
  }

  updateProviderFields()

  // Prompt textarea interactions
  promptTextarea.addEventListener('input', () => {
    previewPre.textContent = promptTextarea.value
    previewPre.style.display = 'block'
  })

  restorePromptBtn.addEventListener('click', async () => {
    promptTextarea.value = DEFAULT_PROMPT
    previewPre.textContent = DEFAULT_PROMPT
    previewPre.style.display = 'block'
  })

  previewBtn.addEventListener('click', () => {
    if (previewPre.style.display === 'none' || previewPre.style.display === '') {
      previewPre.style.display = 'block'
    } else {
      previewPre.style.display = 'none'
    }
  })

  // Event listeners
  providerSelect.addEventListener('change', updateProviderFields)
  temperatureInput.addEventListener('input', (e) => {
    temperatureValue.textContent = (e.target as HTMLInputElement).value
  })

  saveBtn.addEventListener('click', async () => {
    try {
      statusDiv.textContent = 'Saving...'
      statusDiv.className = 'status info'

      const newConfig: LLMConfig = {
        type: providerSelect.value as any,
        model: modelInput.value,
        temperature: parseFloat(temperatureInput.value),
      } as any

      if (providerSelect.value === 'ollama' || providerSelect.value === 'lm-studio') {
        ;(newConfig as any).endpoint = endpointInput.value
      } else {
        ;(newConfig as any).apiKey = apiKeyInput.value
      }

      await setLLMConfig(newConfig)
      await setIncludeImages(includeImagesCheckbox.checked)
      await setPromptTemplate(promptTextarea.value)

      statusDiv.textContent = '✓ Settings saved successfully'
      statusDiv.className = 'status success'

      setTimeout(() => {
        statusDiv.textContent = ''
        statusDiv.className = 'status'
      }, 3000)
    } catch (error) {
      statusDiv.textContent = `✗ Error: ${error instanceof Error ? error.message : String(error)}`
      statusDiv.className = 'status error'
    }
  })

  testBtn.addEventListener('click', async () => {
    try {
      statusDiv.textContent = 'Testing connection...'
      statusDiv.className = 'status info'

      const newConfig: LLMConfig = {
        type: providerSelect.value as any,
        model: modelInput.value,
        temperature: parseFloat(temperatureInput.value),
      } as any

      if (providerSelect.value === 'ollama' || providerSelect.value === 'lm-studio') {
        ;(newConfig as any).endpoint = endpointInput.value
      } else {
        ;(newConfig as any).apiKey = apiKeyInput.value
      }

      const testPrompt = 'Hello, this is a test. Please respond briefly.'
      const endpoint = (newConfig as any).endpoint

      // Request permission for the endpoint origin if it's a local provider
      if (endpoint && (providerSelect.value === 'ollama' || providerSelect.value === 'lm-studio')) {
        try {
          const url = new URL(endpoint)
          // Firefox requires exact origin match for permissions.request
          // For http://192.168.0.79:1234/v1/completions, we need http://192.168.0.79:1234/*
          const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/*`
          console.log('Requesting permission for origin:', origin)
          
          // Check if we already have permission
          const hasPermission = await chrome.permissions.contains({ origins: [origin] })
          if (!hasPermission) {
            // In Firefox, permissions.request must be called from a user action handler
            // This is already inside a click handler, so it should work.
            // However, if it fails, we can try to proceed without it if host_permissions covers it.
            try {
              const granted = await chrome.permissions.request({ origins: [origin] })
              if (granted) {
                console.log('Permission granted for', origin)
              } else {
                console.warn('Permission denied for', origin)
                // Don't throw, maybe host_permissions covers it
              }
            } catch (reqErr) {
              console.warn('Error requesting permission:', reqErr)
            }
          } else {
            console.log('Permission already granted for', origin)
          }
        } catch (e) {
          console.warn('Failed to check/request permission:', e)
        }
      }

      if (newConfig.type === 'ollama' || newConfig.type === 'lm-studio') {
        // Detect if endpoint is chat or completions
        const isChat = endpoint.includes('chat/completions')
        
        const requestBody = isChat
          ? {
              model: newConfig.model,
              messages: [{ role: 'user', content: testPrompt }],
              temperature: newConfig.temperature,
              stream: false,
            }
          : {
              model: newConfig.model,
              prompt: testPrompt,
              stream: false,
              temperature: newConfig.temperature,
            }

        // Create abort controller with 30-second timeout for testing
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          statusDiv.textContent = '✓ Connection successful!'
          statusDiv.className = 'status success'
        } catch (error) {
          clearTimeout(timeoutId)
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out (30 seconds). Model may be slow.')
          }
          throw error
        }
      } else {
        statusDiv.textContent = 'Cloud providers must be tested with valid API key'
        statusDiv.className = 'status info'
      }

      setTimeout(() => {
        statusDiv.textContent = ''
        statusDiv.className = 'status'
      }, 3000)
    } catch (error) {
      statusDiv.textContent = `✗ Connection failed: ${error instanceof Error ? error.message : String(error)}`
      statusDiv.className = 'status error'
    }
  })

  function updateProviderFields() {
    const provider = providerSelect.value
    const endpointSection = document.getElementById('endpoint-section') as HTMLDivElement
    const apiKeySection = document.getElementById('api-key-section') as HTMLDivElement
    const testSection = document.getElementById('test-section') as HTMLDivElement

    if (provider === 'ollama' || provider === 'lm-studio') {
      endpointSection.style.display = 'block'
      apiKeySection.style.display = 'none'
      testSection.style.display = 'block'
    } else {
      endpointSection.style.display = 'none'
      apiKeySection.style.display = 'block'
      testSection.style.display = 'none'
    }
  }
})

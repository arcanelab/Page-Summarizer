/**
 * Options page script - handles configuration UI
 */

import { getLLMConfig, setLLMConfig, getIncludeImages, setIncludeImages } from '@/background/storage'
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

  // Load current settings
  const config = await getLLMConfig()
  const includeImages = await getIncludeImages()

  providerSelect.value = config.type
  modelInput.value = (config as any).model || 'llama2'
  temperatureInput.value = String(config.temperature || 0.7)
  temperatureValue.textContent = String(config.temperature || 0.7)
  includeImagesCheckbox.checked = includeImages

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

      if (newConfig.type === 'ollama' || newConfig.type === 'lm-studio') {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: newConfig.model,
            prompt: testPrompt,
            stream: false,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        statusDiv.textContent = '✓ Connection successful!'
        statusDiv.className = 'status success'
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

/**
 * LLM Service - Handles communication with different LLM providers
 */

import { LLMConfig, PageContent } from '@/shared/types'

export interface LLMResponse {
  analysis: string
  provider: string
  model: string
}

export class LLMService {
  constructor(private config: LLMConfig) {}

  async analyze(content: PageContent): Promise<LLMResponse> {
    if (this.config.type === 'ollama' || this.config.type === 'lm-studio') {
      return this.analyzeLocal(content)
    } else if (this.config.type === 'openai') {
      return this.analyzeOpenAI(content)
    } else if (this.config.type === 'anthropic') {
      return this.analyzeAnthropic(content)
    }

    throw new Error(`Unknown LLM provider: ${this.config.type}`)
  }

  private async analyzeLocal(content: PageContent): Promise<LLMResponse> {
    const config = this.config as any
    const endpoint = config.endpoint

    if (!endpoint) {
      throw new Error('Local LLM endpoint not configured')
    }

    const prompt = this.buildPrompt(content)

    try {
      console.log(`[LLM] Sending request to ${endpoint}`)
      console.log(`[LLM] Model: ${config.model}`)
      console.log(`[LLM] Prompt length: ${prompt.length} chars`)

      // Detect if endpoint is chat or completions and use appropriate format
      const isChat = endpoint.includes('chat/completions')
      
      const requestBody = isChat
        ? {
            model: config.model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: config.temperature,
            stream: false,
          }
        : {
            model: config.model,
            prompt,
            stream: false,
            temperature: config.temperature,
          }

      console.log(`[LLM] Using ${isChat ? 'chat' : 'completions'} format`)

      // Create abort controller with 120-second timeout (some models are slow)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log(`[LLM] Response status: ${response.status}`)

      if (!response.ok) {
        const text = await response.text()
        console.error(`[LLM] HTTP error response:`, text)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[LLM] Received response, data:`, JSON.stringify(data).substring(0, 500))

      // Handle both chat and completions response formats
      let analysis = ''
      if (isChat) {
        // Chat format: response.choices[0].message.content
        const message = data.choices?.[0]?.message
        analysis = message?.content || message?.reasoning_content || ''
        
        // If content is empty but reasoning_content exists, use that
        if (!analysis && message?.reasoning_content) {
          analysis = message.reasoning_content
        }
      } else {
        // Completions format: response.choices[0].text or response.response
        analysis = data.choices?.[0]?.text || data.response || ''
      }

      if (!analysis || analysis.trim() === '') {
        console.warn(`[LLM] Warning: Response was empty, full response:`, JSON.stringify(data))
        throw new Error('LLM returned empty response. The model may need more time to warm up.')
      }

      console.log(`[LLM] Success! Analysis length: ${analysis.length} chars`)

      return {
        analysis,
        provider: this.config.type,
        model: config.model,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[LLM] Request timeout (120 seconds exceeded)`)
        throw new Error('LLM request timed out after 120 seconds. The model may be overloaded.')
      }
      console.error(`[LLM] Request failed:`, error)
      throw new Error(
        `Local LLM request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async analyzeOpenAI(content: PageContent): Promise<LLMResponse> {
    const config = this.config as any
    const apiKey = config.apiKey

    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a helpful assistant that summarizes and analyzes web content.',
      },
      {
        role: 'user' as const,
        content: this.buildPrompt(content),
      },
    ]

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error?.message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()

      return {
        analysis:
          data.choices?.[0]?.message?.content ||
          'No response from OpenAI',
        provider: 'openai',
        model: config.model,
      }
    } catch (error) {
      throw new Error(
        `OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async analyzeAnthropic(content: PageContent): Promise<LLMResponse> {
    const config = this.config as any
    const apiKey = config.apiKey

    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const prompt = this.buildPrompt(content)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: config.temperature,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error?.message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()

      return {
        analysis:
          data.content?.[0]?.text || 'No response from Anthropic',
        provider: 'anthropic',
        model: config.model,
      }
    } catch (error) {
      throw new Error(
        `Anthropic request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private buildPrompt(content: PageContent): string {
    let prompt = `Please analyze and summarize the following web page content:\n\n${content.text}`

    if (content.images.length > 0) {
      prompt += `\n\nThe page also contains ${content.images.length} image(s). If they are relevant to the content analysis, please describe and analyze them.`
    }

    prompt += '\n\nProvide a concise analysis highlighting the key points.'

    return prompt
  }
}

export function createLLMService(config: LLMConfig): LLMService {
  return new LLMService(config)
}

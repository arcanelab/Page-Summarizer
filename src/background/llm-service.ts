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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          prompt,
          stream: false,
          temperature: config.temperature,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        analysis: data.response || '',
        provider: this.config.type,
        model: config.model,
      }
    } catch (error) {
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

/**
 * Shared types for the extension
 */

export interface LLMProvider {
  type: 'ollama' | 'lm-studio' | 'openai' | 'anthropic'
}

export interface LocalLLMProvider extends LLMProvider {
  type: 'ollama' | 'lm-studio'
  endpoint: string
  model: string
  temperature: number
}

export interface CloudLLMProvider extends LLMProvider {
  type: 'openai' | 'anthropic'
  apiKey: string
  model: string
  temperature: number
}

export type LLMConfig = LocalLLMProvider | CloudLLMProvider

export interface AnalysisSettings {
  includeImages: boolean
  provider: LLMConfig
  promptTemplate?: string
}

export interface PageContent {
  text: string
  images: string[] // base64 encoded or URLs
}

export interface AnalysisRequest {
  content: PageContent
  settings: AnalysisSettings
}

export interface AnalysisResult {
  analysis: string
  timestamp: number
  provider: string
  model: string
}

export interface ExtensionMessage {
  action: string
  [key: string]: unknown
}

export interface AnalysisMessage extends ExtensionMessage {
  action: 'analyzePage'
  content: PageContent
}

export interface ResultMessage extends ExtensionMessage {
  action: 'result'
  result: AnalysisResult
}

export interface ErrorMessage extends ExtensionMessage {
  action: 'error'
  error: string
}

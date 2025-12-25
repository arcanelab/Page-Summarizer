/**
 * Storage layer for managing extension configuration
 */

import { storage } from '@/shared/browser-api'
import { LLMConfig, AnalysisSettings } from '@/shared/types'

const DEFAULT_LLM_CONFIG: LLMConfig = {
  type: 'lm-studio',
  endpoint: 'http://localhost:1234/v1/chat/completions',
  model: 'google/gemma-3-1b',
  temperature: 0.7,
} as any

const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  includeImages: false,
  provider: DEFAULT_LLM_CONFIG,
  maxPageChars: 8000,
}

export const DEFAULT_PROMPT = `Please analyze and summarize the following web page content:\n\n{{text}}\n\nThe page also contains {{imagesCount}} image(s). If they are relevant to the content analysis, please describe and analyze them.\n\nProvide a concise analysis highlighting the key points.`

export async function getLLMConfig(): Promise<LLMConfig> {
  const result = await storage.get('llmConfig')
  return result.llmConfig || DEFAULT_LLM_CONFIG
}

export async function setLLMConfig(config: LLMConfig): Promise<void> {
  await storage.set({ llmConfig: config })
}

export async function getPromptTemplate(): Promise<string> {
  const result = await storage.get('promptTemplate')
  return result.promptTemplate ?? DEFAULT_PROMPT
}

export async function setPromptTemplate(template: string): Promise<void> {
  await storage.set({ promptTemplate: template })
}

export async function getAnalysisSettings(): Promise<AnalysisSettings> {
  const result = await storage.get('analysisSettings')
  const config = await getLLMConfig()
  const promptResult = await storage.get('promptTemplate')
  const promptTemplate = promptResult.promptTemplate ?? DEFAULT_PROMPT

  return {
    ...(result.analysisSettings || DEFAULT_ANALYSIS_SETTINGS),
    provider: config,
    promptTemplate,
  }
}

export async function setAnalysisSettings(
  settings: Partial<AnalysisSettings>
): Promise<void> {
  const current = await getAnalysisSettings()
  await storage.set({
    analysisSettings: {
      ...current,
      ...settings,
      provider: undefined, // Provider stored separately
    },
  })
}

export async function getIncludeImages(): Promise<boolean> {
  const result = await storage.get('analysisSettings')
  return result.analysisSettings?.includeImages ?? DEFAULT_ANALYSIS_SETTINGS.includeImages
}

export async function setIncludeImages(include: boolean): Promise<void> {
  const current = await storage.get('analysisSettings')
  await storage.set({
    analysisSettings: {
      ...(current.analysisSettings || {}),
      includeImages: include,
    },
  })
}

export async function clearAllSettings(): Promise<void> {
  await storage.clear()
}

export async function initializeDefaultSettings(): Promise<void> {
  const result = await storage.get('llmConfig')
  if (!result.llmConfig) {
    await setLLMConfig(DEFAULT_LLM_CONFIG)
    await setAnalysisSettings(DEFAULT_ANALYSIS_SETTINGS)
  }

  const promptResult = await storage.get('promptTemplate')
  if (!promptResult?.promptTemplate) {
    await setPromptTemplate(DEFAULT_PROMPT)
  }
}

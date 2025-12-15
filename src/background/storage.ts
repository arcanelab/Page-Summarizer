/**
 * Storage layer for managing extension configuration
 */

import { storage } from '@/shared/browser-api'
import { LLMConfig, AnalysisSettings } from '@/shared/types'

const DEFAULT_LLM_CONFIG: LLMConfig = {
  type: 'lm-studio',
  endpoint: 'http://localhost:1234/v1/chat/completions',
  model: 'zai-org/glm-4.6v-flash',
  temperature: 0.7,
} as any

const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  includeImages: false,
  provider: DEFAULT_LLM_CONFIG,
}

export async function getLLMConfig(): Promise<LLMConfig> {
  const result = await storage.get('llmConfig')
  return result.llmConfig || DEFAULT_LLM_CONFIG
}

export async function setLLMConfig(config: LLMConfig): Promise<void> {
  await storage.set({ llmConfig: config })
}

export async function getAnalysisSettings(): Promise<AnalysisSettings> {
  const result = await storage.get('analysisSettings')
  const config = await getLLMConfig()
  return {
    ...(result.analysisSettings || DEFAULT_ANALYSIS_SETTINGS),
    provider: config,
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
}

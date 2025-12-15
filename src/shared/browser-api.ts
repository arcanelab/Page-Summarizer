/**
 * Browser API abstraction layer
 * Provides unified interface for both Firefox and Chrome
 */

declare global {
  const chrome: typeof chrome
}

// Export unified browser object
export const browser = globalThis.chrome || (globalThis as any).browser

// Helper to check if running in Firefox
export function isFirefox(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.includes('Firefox')
  )
}

// Helper to check if running in Chrome/Chromium
export function isChrome(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.includes('Chrome')
  )
}

// Unified storage access
export const storage = browser.storage.local

// Unified messaging
export const messaging = {
  send: (message: unknown) => browser.runtime.sendMessage(message),
  sendTab: (tabId: number, message: unknown) =>
    browser.tabs.sendMessage(tabId, message),
  onMessage: browser.runtime.onMessage,
}

// Unified tabs
export const tabs = {
  query: (queryInfo: chrome.tabs.QueryInfo) => browser.tabs.query(queryInfo),
  get: (tabId: number) => browser.tabs.get(tabId),
  sendMessage: (tabId: number, message: unknown) =>
    browser.tabs.sendMessage(tabId, message),
}

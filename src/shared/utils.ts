/**
 * Utility functions for the extension
 */

export function encodeImageAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function fetchImageAsDataUrl(
  imageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    return encodeImageAsDataUrl(blob)
  } catch (error) {
    console.warn(`Failed to fetch image ${imageUrl}:`, error)
    return null
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function sanitizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function extractMainContent(): string {
  const selectors = [
    'article',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.content',
    '#content',
    'main',
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) {
      return element.innerText
    }
  }

  return document.body.innerText
}

export function extractImages(maxImages: number = 10): string[] {
  const images: string[] = []
  const imgElements = document.querySelectorAll('img')

  for (let i = 0; i < Math.min(imgElements.length, maxImages); i++) {
    const img = imgElements[i]
    const src = img.src || img.dataset.src

    if (src) {
      images.push(src)
    }
  }

  return images
}

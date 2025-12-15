#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const platform = process.argv[2] || 'firefox'

const distDir = platform === 'chrome' ? 'dist-chrome' : 'dist-firefox'
const manifestPath = path.join(projectRoot, 'public', `manifest-${platform}.json`)
const outputPath = path.join(projectRoot, distDir, 'manifest.json')

// Ensure output directory exists
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Copy manifest
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2))
  console.log(`✓ Created ${platform} manifest at ${outputPath}`)
} else {
  console.error(`✗ Manifest file not found: ${manifestPath}`)
  process.exit(1)
}

// Copy other assets from dist to platform-specific folder
const srcAssets = path.join(projectRoot, 'dist')
if (fs.existsSync(srcAssets)) {
  const files = fs.readdirSync(srcAssets)
  files.forEach((file) => {
    if (file !== 'manifest.json') {
      const src = path.join(srcAssets, file)
      const dest = path.join(projectRoot, distDir, file)
      if (fs.lstatSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true, force: true })
      } else {
        fs.copyFileSync(src, dest)
      }
    }
  })
}

// Move HTML files from nested src/ folder to root
const srcDir = path.join(projectRoot, distDir, 'src')
if (fs.existsSync(srcDir)) {
  // Find and move popup.html, options.html, and results.html
  const popupSrc = path.join(srcDir, 'popup', 'popup.html')
  const optionsSrc = path.join(srcDir, 'options', 'options.html')
  const resultsSrc = path.join(srcDir, 'results', 'results.html')
  
  const popupDest = path.join(projectRoot, distDir, 'popup.html')
  const optionsDest = path.join(projectRoot, distDir, 'options.html')
  const resultsDest = path.join(projectRoot, distDir, 'results.html')
  
  if (fs.existsSync(popupSrc)) {
    let popupContent = fs.readFileSync(popupSrc, 'utf-8')
    // Fix asset paths and inject CSS
    popupContent = popupContent
      .replace(/src="\/([^"]*)"/, 'src="$1"')
      .replace(/href="\/([^"]*)"/, 'href="$1"')
      .replace('</title>', '</title>\n    <link rel="stylesheet" href="popup.css">')
    fs.writeFileSync(popupDest, popupContent)
    console.log(`✓ Moved popup.html to root`)
  }
  
  if (fs.existsSync(optionsSrc)) {
    let optionsContent = fs.readFileSync(optionsSrc, 'utf-8')
    // Fix asset paths and inject CSS
    optionsContent = optionsContent
      .replace(/src="\/([^"]*)"/, 'src="$1"')
      .replace(/href="\/([^"]*)"/, 'href="$1"')
      .replace('</title>', '</title>\n    <link rel="stylesheet" href="options.css">')
    fs.writeFileSync(optionsDest, optionsContent)
    console.log(`✓ Moved options.html to root`)
  }
  
  if (fs.existsSync(resultsSrc)) {
    let resultsContent = fs.readFileSync(resultsSrc, 'utf-8')
    // Fix asset paths and inject CSS
    resultsContent = resultsContent
      .replace(/src="\/([^"]*)"/, 'src="$1"')
      .replace(/href="\/([^"]*)"/, 'href="$1"')
      .replace('</title>', '</title>\n    <link rel="stylesheet" href="results.css">')
    fs.writeFileSync(resultsDest, resultsContent)
    console.log(`✓ Moved results.html to root`)
  }
  
  // Remove the src folder
  fs.rmSync(srcDir, { recursive: true, force: true })
}

// Copy background.html from public to dist
const bgHtmlSrc = path.join(projectRoot, 'public', 'background.html')
const bgHtmlDest = path.join(projectRoot, distDir, 'background.html')
if (fs.existsSync(bgHtmlSrc)) {
  fs.copyFileSync(bgHtmlSrc, bgHtmlDest)
  console.log(`✓ Copied background.html to root`)
}

console.log(`✓ Copied assets to ${distDir}`)

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
      const dest = path.join(distDir, file)
      if (fs.lstatSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true, force: true })
      } else {
        fs.copyFileSync(src, dest)
      }
    }
  })
  console.log(`✓ Copied assets to ${distDir}`)
}

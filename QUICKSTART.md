# Quick Start Guide

## 1. Setup Environment

```bash
cd /Users/zoltan/Development/Misc/LocalSummarizer
npm install
```

## 2. Prepare LLM (Optional but Recommended)

### For Ollama (Easiest)
```bash
# Install Ollama from https://ollama.ai
# Then in terminal:
ollama run llama2
```

The API will be available at: `http://localhost:11434/api/generate`

### For LM Studio
- Download from https://lmstudio.ai
- Load a model in the app
- Start the local server (usually on port 1234)
- API endpoint: `http://localhost:1234/v1/completions`

## 3. Build for Development

```bash
# Watch mode - automatically rebuilds on file changes
npm run dev
```

## 4. Load in Firefox

1. In a new tab, go to: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to your project folder and select `dist/manifest.json`
   - OR from `dist-firefox/manifest.json` if you already built it
4. The extension should appear in your toolbar

## 5. Configure the Extension

1. Click the extension icon (puzzle piece icon in toolbar)
2. Click the "Settings" link
3. Configure:
   - **Provider**: Select "Ollama" or your chosen provider
   - **Endpoint**: Use defaults or customize
   - **Model**: "llama2" for Ollama, or your chosen model
   - **Temperature**: Keep at 0.7 for balanced output
   - **Include images**: Toggle based on preference
4. Click "Save Settings"
5. If local provider, click "Test Connection" to verify

## 6. Test It Out

1. Visit any website (try Wikipedia, news sites, documentation)
2. Click the Local Summarizer extension icon
3. Click "Analyze Page"
4. Watch the magic happen! 🎉

## Development Workflow

### File Structure to Know

```
src/
├── background/index.ts      ← Main background script, message handling
├── content/index.ts         ← Runs on web pages, extracts content
├── popup/popup.html/ts      ← Click icon → this shows up
├── options/options.html/ts  ← Settings page
└── shared/                  ← Shared types and utilities
```

### Common Tasks

**Change LLM provider behavior:**
- Edit `src/background/llm-service.ts` → `analyzeLocal()`, `analyzeOpenAI()`, etc.

**Modify page extraction:**
- Edit `src/shared/utils.ts` → `extractMainContent()`, `extractImages()`

**Change popup UI:**
- Edit `src/popup/popup.html` and `src/popup/popup.css`

**Add new settings:**
- Edit `src/options/options.html` (UI)
- Edit `src/background/storage.ts` (storage logic)
- Edit `src/options/options.ts` (settings page logic)

### Debugging

1. **Background script errors**:
   - Firefox: about:debugging → Local Extensions → Your extension → Inspect
   - Chrome: chrome://extensions → Local Summarizer → Details → Errors

2. **Content script errors**:
   - Open any website, press F12 → Console

3. **Popup errors**:
   - Click extension icon, press F12 within the popup

4. **Storage issues**:
   - Check browser console: `chrome.storage.local.get(console.log)`

## Building for Release

### Firefox Build
```bash
npm run build:firefox
# Creates dist-firefox/ with manifest.json and all assets
# Ready to submit to Firefox Add-ons store
```

### Chrome Build
```bash
npm run build:chrome
# Creates dist-chrome/ with manifest.json and all assets
# Ready to submit to Chrome Web Store
```

## Next Steps

1. **Create Icons**: Replace placeholder icons in `public/icons/` with your own designs
2. **Add More Features**: 
   - Save analysis history
   - Custom prompt templates
   - Multiple language support
3. **Polish UI**: Enhance popup and settings designs
4. **Test Thoroughly**: Try different websites and LLM providers

## Useful Resources

- **Firefox Extension Docs**: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/
- **Ollama**: https://ollama.ai
- **LM Studio**: https://lmstudio.ai
- **OpenAI API**: https://platform.openai.com
- **Anthropic API**: https://console.anthropic.com

## Troubleshooting

**"Cannot find module..." error**
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

**Extension not loading in Firefox**
- Make sure `about:debugging` shows no errors
- Try loading the manifest.json file directly

**"Connection refused" when testing**
- Ensure Ollama/LM Studio is running
- Check endpoint URL matches what's running
- Verify firewall isn't blocking localhost connections

**Changes not appearing**
- Make sure `npm run dev` is still running
- Check browser console for build errors
- Try hard-refreshing the extension (reload in about:debugging)

---

**You're all set! Start analyzing websites with local LLMs! 🚀**

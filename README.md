# Local Summarizer - Firefox & Chrome Extension

A powerful browser extension for analyzing website content using local and cloud-based LLMs.

## Features

- 📄 **Full Page Analysis**: Extract and analyze entire webpage content
- 🖼️ **Optional Image Support**: Include or exclude images from analysis
- 🔄 **Multiple LLM Providers**:
  - **Local**: Ollama, LM Studio
  - **Cloud**: OpenAI, Anthropic
- ⚙️ **Easy Configuration**: Simple settings page for provider selection and parameters
- 🔒 **Privacy-Focused**: Supports local LLMs for on-device processing
- 🌐 **Cross-Platform**: Works on Firefox and Chrome

## Installation

### Prerequisites

- Node.js 16+ and npm
- Firefox or Chrome browser

### Local LLM Setup (Optional)

For local LLM analysis, install one of:

- **Ollama**: https://ollama.ai
  - Download and install, then run: `ollama run llama2`
  - API endpoint: `http://localhost:11434/api/generate`

- **LM Studio**: https://lmstudio.ai
  - Download, install, and load a model
  - API endpoint: `http://localhost:1234/v1/completions`

### Build the Extension

1. **Clone or extract the project**
```bash
cd LocalSummarizer
npm install
```

2. **Build for Firefox**
```bash
npm run build:firefox
```

3. **Build for Chrome**
```bash
npm run build:chrome
```

The built extensions will be in `dist-firefox` and `dist-chrome` directories.

## Development

### Watch Mode
```bash
npm run dev
```

### Run in Firefox (requires `dist-firefox`)
```bash
npm run firefox
```

### Lint Extension
```bash
npm run lint
```

## Loading the Extension

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file from `dist-firefox` folder

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist-chrome` folder

## Configuration

1. Click the extension icon in your toolbar
2. Click "Settings" link
3. Configure your preferred LLM provider:
   - **Provider**: Choose local (Ollama/LM Studio) or cloud (OpenAI/Anthropic)
   - **Endpoint/API Key**: Enter your provider's connection details
   - **Model**: Specify the model to use
   - **Temperature**: Control output creativity (0.0-1.0)
   - **Include Images**: Toggle image analysis

4. Click "Save Settings"

## Usage

1. Visit any website
2. Click the Local Summarizer extension icon
3. Click "Analyze Page"
4. The extension will extract the page content and send it to your configured LLM
5. Analysis results will appear in the popup

## Project Structure

```
src/
├── background/           # Background script and LLM service
│   ├── index.ts         # Main background script
│   ├── llm-service.ts   # LLM provider implementations
│   └── storage.ts       # Configuration storage
├── content/             # Content script (runs on pages)
│   └── index.ts         # Page extraction and messaging
├── popup/               # Popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.ts
├── options/             # Settings page
│   ├── options.html
│   ├── options.css
│   └── options.ts
└── shared/              # Shared utilities
    ├── types.ts         # TypeScript interfaces
    ├── browser-api.ts   # Browser API abstraction
    └── utils.ts         # Helper functions
```

## Architecture

### Message Flow

```
Content Script (Page Access)
    ↓
User clicks "Analyze Page" in Popup
    ↓
Popup sends message to Background Script
    ↓
Background Script extracts page content from Content Script
    ↓
Background Script sends request to LLM provider
    ↓
LLM returns analysis
    ↓
Result displayed in Popup/Content Script
```

### Supported Providers

#### Ollama
- **Endpoint**: `http://localhost:11434/api/generate`
- **Models**: llama2, mistral, neural-chat, etc.
- **Installation**: https://ollama.ai

#### LM Studio
- **Endpoint**: `http://localhost:1234/v1/completions`
- **Setup**: Load any GGML-compatible model
- **Website**: https://lmstudio.ai

#### OpenAI
- **Models**: gpt-4, gpt-3.5-turbo, etc.
- **API Key**: Get from https://platform.openai.com
- **Pricing**: Per-token billing

#### Anthropic
- **Models**: claude-2, claude-instant, etc.
- **API Key**: Get from https://console.anthropic.com
- **Pricing**: Per-token billing

## Development Tips

### Understanding Content Scripts
Content scripts run on web pages and have DOM access. They communicate with the background script via message passing:

```typescript
// In content script
chrome.runtime.sendMessage({ action: 'analyzePage', content: pageContent });

// In background script
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'analyzePage') {
    // Process request
  }
});
```

### Adding New LLM Providers
1. Add provider to `LLMConfig` type in `src/shared/types.ts`
2. Implement provider adapter in `src/background/llm-service.ts`
3. Add UI controls in `src/options/options.html` and `src/options/options.ts`
4. Update manifest permissions for new endpoints

### Testing
- Use `npm run dev` for hot-reload during development
- Check browser console (F12) for errors
- Use the "Test Connection" button in Settings for LLM providers

## Troubleshooting

### "Connection refused" error
- **Local LLM**: Ensure Ollama or LM Studio is running on the configured endpoint
- **Cloud LLM**: Verify API key is correct and has valid credits

### Images not working
- Enable "Include images in analysis" in Settings
- Ensure images are from accessible URLs (not CORS-blocked)

### Slow analysis
- Reduce model size or use a faster model
- Decrease text length (extension limits to 8000 characters)
- Check LLM provider performance

## Security Notes

- **API Keys**: Stored in browser's local storage (encrypted by browser on most platforms)
- **Local Endpoints**: Only accessible from your machine (localhost)
- **Cloud Services**: Uses HTTPS for all communication
- **No Data Transmission**: Page content is sent to configured LLM only, never to extension servers

## License

MIT - Feel free to modify and distribute

## Contributing

Contributions welcome! Areas for improvement:
- Better error handling and user feedback
- Support for more LLM providers
- Improved content extraction
- Custom prompt templates
- Analysis history/caching
- Multi-language support

---

Built with ❤️ for privacy-conscious developers

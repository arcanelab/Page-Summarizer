# Architecture & Technical Deep Dive

## Overview

This is a dual-platform browser extension (Firefox + Chrome) built with TypeScript and Vite. It enables users to analyze web page content using local or cloud-based LLMs.

## Core Architecture

### Message Flow Diagram

```
User Interaction:
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks extension icon → Popup.tsx opens            │
│  2. User clicks "Analyze Page" button                       │
│  3. Results window opens, popup closes                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  results.ts (NEW WINDOW)            │
        │  1. Connects to background via port │
        │  2. Sends "register" with windowId │
        │  3. Sends "ping" every 5 seconds   │
        │     (keeps background alive)        │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  popup.ts sends to background:      │
        │  "analyzePageWithWindow"            │
        │  Returns immediately (async)        │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  background/index.ts                │
        │  1. Creates results window          │
        │  2. Sends "updateStatus" via port  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  content/index.ts (on web page)     │
        │  1. Extracts text via innerText     │
        │  2. Extracts images (if enabled)    │
        │  3. Returns PageContent object      │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  background receives content        │
        │  Sends "updateStatus" → LLM...     │
        │  via results window port            │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  llm-service.ts                     │
        │  Routes to appropriate provider:    │
        │  - analyzeLocal() → Ollama/LM       │
        │  - analyzeOpenAI() → OpenAI API     │
        │  - analyzeAnthropic() → Anthropic   │
        │  (Heartbeat ping keeps connection)  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  LLM Provider (Ollama/OpenAI/etc)   │
        │  Returns: { analysis, model, ... }  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  background sends result via port   │
        │  to results window                  │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │  results.ts receives message        │
        │  Updates UI with analysis result    │
        └──────────────────────────────────────┘
```

### Key Improvement: Port-Based Messaging

The extension uses **persistent port connections** (`chrome.runtime.connect()`) instead of one-off messages:
- **Reliability**: Survives background script idle termination
- **Bidirectional**: Background can send multiple updates before completion
- **Status Updates**: Real-time progress shown in results window
- **Keep-Alive**: Results window sends "ping" every 5 seconds to keep background script active

## Directory Structure Deep Dive

### `/src/background/`

**Responsible for:** LLM communication, configuration management, message routing

#### `index.ts` - Main Background Script
- Listens for extension lifecycle events (`onInstalled`)
- Routes incoming messages from content/popup scripts
- Maintains `resultPorts` map for results window connections
- Queues messages for results windows that haven't connected yet
- Handles `analyzePageWithWindow` action:
  - Creates results window via `chrome.windows.create()`
  - Returns immediately (async operation)
  - Retrieves LLM config
  - Creates LLMService instance
  - Calls analyze() and sends results via port
- Listens for port connections from results windows:
  - `port.onConnect`: Registers new results window
  - `port.onMessage`: Handles register/ping messages
  - `port.onDisconnect`: Cleans up port from map
- Listens for storage changes

#### `llm-service.ts` - LLM Provider Adapters
```
LLMService (factory pattern)
├── analyze() → routes to provider method
├── analyzeLocal() → Ollama/LM Studio
│   └── Sends to endpoint with prompt
├── analyzeOpenAI() → OpenAI API
│   └── Chat completions endpoint
└── analyzeAnthropic() → Anthropic API
    └── Messages endpoint
```

**Key Concepts:**
- Uses async/await for all network requests
- Includes error handling with meaningful messages
- Builds prompts dynamically based on content

#### `storage.ts` - Configuration Layer
```
Exported Functions:
├── getLLMConfig() → Get current LLM setup
├── setLLMConfig() → Save LLM configuration
├── getAnalysisSettings() → Get all settings
├── setAnalysisSettings() → Partial update
├── getIncludeImages() → Check image inclusion
├── setIncludeImages() → Toggle image analysis
├── initializeDefaultSettings() → First-run setup
└── clearAllSettings() → Reset to defaults
```

**Storage Schema:**
```javascript
{
  llmConfig: {
    type: 'ollama' | 'lm-studio' | 'openai' | 'anthropic',
    endpoint?: string,  // for local providers
    apiKey?: string,    // for cloud providers
    model: string,
    temperature: 0-1
  },
  analysisSettings: {
    includeImages: boolean
  }
}
```

### `/src/results/` (NEW)

**Responsible for:** Dedicated window for displaying analysis results

#### `results.html`
- Clean UI with status, result, and error sections
- Shows loading spinner during analysis
- Displays provider and model info
- Copy and retry buttons

#### `results.ts`
- Establishes port connection to background script
- Sends windowId for registration
- Sends periodic ping messages (every 5 seconds) as keep-alive
- Listens for status/result/error messages via port
- Updates UI based on message type
- Handles copy-to-clipboard and retry functionality

#### `results.css`
- Purple gradient header
- Smooth animations and transitions
- Responsive scrollable content area

### `/src/content/`

**Responsible for:** Page content extraction

#### `index.ts` - Content Script
Runs on every page in an isolated context. Key functions:

```typescript
getPageContent(): PageContent
├── Extracts main text via extractMainContent()
├── Sanitizes and truncates (8000 chars max)
└── Extracts images if enabled

displayResult(): Shows notification on page
├── Creates fixed bottom-right div
├── Includes provider/model info
└── Auto-removes after 30 seconds

displayError(): Shows error notification
├── Red styling for visibility
└── Auto-removes after 10 seconds
```

**Isolation Note:** Content scripts run in a sandbox. They can:
- Access page DOM ✓
- Communicate with background via messaging ✓
- Access extension APIs ✓
- NOT access page JS variables ✗

### `/src/popup/`

**Responsible for:** User interaction UI, triggering analysis

#### `popup.html`
```html
┌─────────────────────────┐
│ header                  │
│  h1: "Local Summarizer"  │
│  link: "Settings"       │
├─────────────────────────┤
│ [Analyze Page] button   │
│ Status: "Opening..."    │
│ (Results in new window) │
└─────────────────────────┘
```

#### `popup.ts`
```
Flow:
1. DOMContentLoaded → loadSettings()
2. User clicks "Analyze Page"
3. Get active tab via chrome.tabs.query()
4. Send "analyzePageWithWindow" to background
   (includes tabId for content extraction)
5. Background creates results window
6. Results window port connects to background
7. Background processes analysis
8. Results sent to results window via port
9. Popup closes (analysis continues in results window)
```

#### `popup.css`
- Fixed width: 400px
- Clean, minimal design
- Color-coded messages (blue/green/red)
- Responsive text wrapping

### `/src/options/`

**Responsible for:** Configuration UI

#### `options.html`
```
Form Fields:
├── Provider Select (Ollama/LM Studio/OpenAI/Anthropic)
├── Endpoint (local providers only)
├── API Key (cloud providers only)
├── Model (text input)
├── Temperature (range slider 0-1)
├── Include Images (checkbox)
├── Test Connection button (local only)
└── Save Settings button

Help Section:
└── Instructions for each provider
```

#### `options.ts`
```
On Load:
1. Get current config from storage
2. Populate form fields
3. Show/hide fields based on provider type

updateProviderFields():
├── Local → Show endpoint, hide API key, enable test
└── Cloud → Hide endpoint, show API key, disable test

Save Handler:
1. Read form values
2. Create LLMConfig object
3. Save via setLLMConfig()
4. Show success message

Test Handler (local only):
1. Get form values
2. Send test request to endpoint
3. Show success/failure message
```

### `/src/shared/`

#### `types.ts` - TypeScript Interfaces
```typescript
LLMConfig
├── LocalLLMProvider { type, endpoint, model, temperature }
└── CloudLLMProvider { type, apiKey, model, temperature }

PageContent
├── text: string (8000 char max)
└── images: string[] (URLs)

AnalysisRequest
├── content: PageContent
└── settings: AnalysisSettings

AnalysisResult
├── analysis: string
├── timestamp: number
├── provider: string
└── model: string

ExtensionMessage (union type for all messages)
├── AnalysisMessage { action: 'analyzePage', content }
├── ResultMessage { action: 'result', result }
└── ErrorMessage { action: 'error', error }
```

#### `browser-api.ts` - Cross-Platform Abstraction
```
Exports unified "browser" object
├── Detects platform (Firefox/Chrome)
├── Exports: storage, messaging, tabs
└── Provides compatibility layer

Unified API:
├── browser.storage.local.get/set
├── browser.runtime.sendMessage
├── browser.tabs.query/sendMessage
└── All return Promises
```

#### `utils.ts` - Helper Functions
```
Content Extraction:
├── extractMainContent() → Finds page's main text
├── extractImages() → Gets img elements (max 5)
└── sanitizeText() → Removes excess whitespace

Text Processing:
├── truncateText() → Limits to max length
├── escapeHtml() → Prevents XSS
└── encodeImageAsDataUrl() → Converts blob to base64

Image Handling:
└── fetchImageAsDataUrl() → Fetches and encodes remote images
```

## Data Flow Examples

### Example 1: Local LLM Analysis

```
1. User on Wikipedia, clicks extension
2. Popup shown (width 400px)
3. User clicks "Analyze Page"
4. popup.ts → content.ts: "getPageContent"
5. content.ts:
   - Extracts document.body.innerText
   - Finds first 5 images
   - Returns { text: "...", images: [...] }
6. popup.ts → background.ts: "analyzePage" + content
7. background.ts:
   - Gets config from storage: { type: 'ollama', endpoint: '...', model: 'llama2' }
   - Creates LLMService(config)
   - Calls service.analyze(content)
8. llm-service.analyzeLocal():
   - Builds prompt: "Please analyze: {text}"
   - Fetches POST to http://localhost:11434/api/generate
   - Request: { model: 'llama2', prompt, stream: false }
   - Response: { response: "This article discusses..." }
9. Result sent back to popup
10. popup displays result with fade-out after 30s
```

### Example 2: Cloud LLM Analysis

```
1-6. Same as above
7. background.ts:
   - Gets config: { type: 'openai', apiKey: 'sk-...', model: 'gpt-4' }
   - Creates LLMService(config)
   - Calls service.analyze(content)
8. llm-service.analyzeOpenAI():
   - Builds messages: [{ role: 'user', content: "Analyze: {text}" }]
   - Fetches POST to https://api.openai.com/v1/chat/completions
   - Headers: { Authorization: 'Bearer sk-...' }
   - Response: { choices: [{ message: { content: "..." } }] }
9-10. Same result flow
```

## TypeScript Flow

All communication between contexts is typed:

```typescript
// Content script → Background
const pageContent: PageContent = {
  text: string,
  images: string[]
}

const message: AnalysisMessage = {
  action: 'analyzePage',
  content: pageContent
}

// Background → LLM Service
const response: LLMResponse = {
  analysis: string,
  provider: 'ollama',
  model: 'llama2'
}

// Background → Content/Popup
const result: ResultMessage = {
  action: 'result',
  result: {
    analysis: string,
    timestamp: number,
    provider: string,
    model: string
  }
}
```

## Build System

### Vite Configuration
```
Entry Points:
├── background: src/background/index.ts
├── content: src/content/index.ts
├── popup: src/popup/popup.html
└── options: src/options/options.html

Output:
├── JS files: background.js, content.js, popup.js, options.js
├── CSS files: popup.css, options.css
└── HTML files: src/popup/popup.html, src/options/options.html
```

### Dual-Build Process
```
npm run build:firefox:
1. Vite build → dist/
2. scripts/build-manifest.js firefox
3. Copies dist/* to dist-firefox/
4. Copies manifest-firefox.json as manifest.json

npm run build:chrome:
1. Vite build → dist/
2. scripts/build-manifest.js chrome
3. Copies dist/* to dist-chrome/
4. Copies manifest-chrome.json as manifest.json
```

## Security Model

### Content Script Isolation
- Runs in isolated context (cannot access page variables)
- Can access DOM and some extension APIs
- Communication only via messaging (serializable data)

### Storage Security
- Uses `storage.local` (encrypted by browser on most platforms)
- API keys stored as plain text (consider encryption layer for production)
- No transmission to external servers except configured LLM endpoints

### Permission Model
```
Required:
- storage: Config storage
- activeTab: Know current tab
- scripting: Inject content script

Optional (Firefox):
- http://localhost/*: Local LLMs
- https://api.openai.com/*: OpenAI
- https://api.anthropic.com/*: Anthropic

Host (Chrome):
- Same as optional permissions
```

## Performance Considerations

1. **Content Extraction**: Limited to 8000 characters to avoid overwhelming LLMs
2. **Image Count**: Max 5 images to avoid excessive processing
3. **Caching**: Could add analysis result caching (future feature)
4. **Network**: All LLM requests are async, doesn't block UI

## Future Enhancement Opportunities

1. **Analysis History**: Store past analyses for review
2. **Batch Processing**: Analyze multiple tabs
3. **Custom Prompts**: User-defined analysis templates
4. **Streaming Responses**: Show results as they arrive
5. **Multi-language**: Analyze and translate content
6. **Export**: Save analyses as PDF/Markdown
7. **Browser Sync**: Sync settings across devices
8. **Provider Rotation**: Fallback to secondary provider

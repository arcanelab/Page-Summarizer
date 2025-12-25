
# Page Summarizer

Page Summarizer is a browser extension (Firefox and Chrome) that extracts page content and sends it to a configured LLM (local or cloud) for analysis.

## Quick start

Install dependencies and build:

```bash
npm install
npm run build:firefox    # or: npm run build:chrome
```

Load the produced `dist-firefox/manifest.json` (Firefox) or the `dist-chrome` folder (Chrome) as an unpacked/temporary extension.

## Usage

1. Open the extension popup and click "Summarize Page".
2. The extension extracts page text (and optionally images) and opens a results window that shows progress and the analysis output.

## Configuration

Open the Options page to set:

- LLM provider (Ollama / LM Studio / OpenAI / Anthropic)
- Endpoint or API key
- Model and temperature
- Setting whether to include images
- Max page characters: truncation limit for extracted page text (default 8000)..

Settings are stored locally via the browser storage API.

## Development

Watch and dev server:

```bash
npm run dev
```

Run the packaged extension in Firefox (after build):

```bash
npm run firefox
```

## License

MIT

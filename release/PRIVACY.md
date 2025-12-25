Page Summarizer - Privacy Statement

Last updated: 2025-12-25

Summary
- Page Summarizer reads the content of the web pages you request it to summarize.
- Page content is processed locally in your browser and is only sent to the LLM provider you configure (local host or a cloud provider you provide credentials for).

Data storage and transmission
- API keys you paste into the Options page are stored only in `browser.storage.local` on your machine and are not transmitted to any third party by this extension.
- Page text and (optional) image data are sent only to the provider you select in Options. If you configure a local provider (Ollama / LM Studio), data stays within your network; if you configure a cloud provider (OpenAI / Anthropic), data will be transmitted to that provider per their API behavior.

Permissions
- The extension requests the following permissions:
  - `storage` — to persist your settings and API keys locally.
  - `activeTab`, `scripting`, and host permissions (`http://*/*`, `https://*/*`) — required to extract the page content you ask to summarize. These are necessary for the extension to access the page DOM when you click "Summarize Page".

Telemetry and analytics
- This extension does not collect analytics or telemetry.

User control
- You can remove stored API keys and settings by opening the Options page and using the provided controls or by clearing extension data via the browser's extension settings.
- To prevent the extension from reading a page, either disable the extension or do not click the summarize action on that page.

Contact
- For privacy questions, open an issue in the repository or contact the maintainer listed in the repository metadata.

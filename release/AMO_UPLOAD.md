AMO Upload Checklist and Instructions

1) Files prepared
- Artifact: `web-ext-artifacts/page_summarizer-0.1.0.zip` (already generated).
- Privacy statement: `release/PRIVACY.md` (link or copy into AMO form).
- Release notes: `release/RELEASE_NOTES.md`.

2) Required screenshots and assets
- Provide at least one screenshot (recommended sizes: 1280×800 for listing; 640×480 for thumbnail).
- Place your screenshots in `release/screenshots/` for safekeeping.
- Provide a high-resolution icon (128×128) — `public/icons/icon.svg` exists; convert to PNG if AMO requires PNG.

3) Metadata to prepare in AMO submission form
- Summary (short): "Summarize websites with local and cloud LLMs"
- Detailed description: Use `public/manifest-firefox.json` description plus usage instructions from README.
- Privacy policy URL or text: paste contents of `release/PRIVACY.md` or link to hosted policy.
- Release notes: use `release/RELEASE_NOTES.md`.

4) Lint and validation
- Already validated locally with `web-ext lint -s dist-firefox` — 0 errors/warnings.

5) Upload steps (manual)
- Go to https://addons.mozilla.org/en-US/developers/addon/submit/ and follow the guided workflow.
- Upload the XPI from `web-ext-artifacts/page_summarizer-0.1.0.zip`.
- **Source Code Submission**: When asked "Do you use any of the following... (minifiers, webpack, etc.)", select **Yes**.
- Upload the source archive: `web-ext-artifacts/page_summarizer-0.1.0-source.zip`.
- **Build Instructions**: In the reviewer notes, provide these steps:
    1. Install Node.js (v18+)
    2. Run `npm install`
    3. Run `npm run build:firefox`
    4. The output will be in `dist-firefox/`.
- **IMPORTANT:** If you make any changes to the manifest or code, you MUST run `npm run build:firefox && npx web-ext build -s dist-firefox --overwrite-dest` to regenerate the ZIP files before uploading.
- Fill in the metadata fields (summary, description, privacy, screenshots).
- Choose distribution channel (unlisted or public), submit for review.

6) CLI alternative (optional)
- You can upload programmatically using `web-ext sign` and the AMO API; follow web-ext docs for signing and publishing.

7) Suggested release note text for AMO listing
- "v0.1.0 — Initial release. Rebranded to Page Summarizer; added configurable page truncation (default 8000 chars) with token estimate; improved security and fixed DOM sanitization."

8) Support/Contact
- Provide a support URL (repository issues page) and an email if desired.

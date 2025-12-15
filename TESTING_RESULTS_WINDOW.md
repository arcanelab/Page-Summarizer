# Testing the Results Window Feature

## Quick Test Steps

### 1. Open a Website
Navigate to any website with content (e.g., Hacker News, Medium article, etc.)

### 2. Click the Extension Icon
Click the **Local Summarizer** extension icon in the Firefox toolbar

### 3. Click "Analyze Page"
You should see:
- ✅ A **new window opens** (approximately 700x600 pixels)
- ✅ Window shows a **purple gradient header** with "Local Summarizer" title
- ✅ **Loading icon** with spinning animation
- ✅ Text says "Extracting page content..."

### 4. Wait for Status Update
Within a second or two:
- ✅ Status text changes to "Sending to LLM server..."
- ✅ Background script processes the content

### 5. See the Results
Once the LLM responds (usually 10-30 seconds):
- ✅ Status section disappears
- ✅ Results section appears with:
  - Provider info: "LM STUDIO • zai-org/glm-4.6v-flash" (or your model)
  - Full analysis text from the LLM
  - Copy button (top right)

### 6. Copy Results (Optional)
- Click the **Copy** button
- Button text changes to "Copied!" for 2 seconds
- Results are now on your clipboard

## Troubleshooting

### Window Doesn't Open
**Problem:** Results window doesn't appear when you click "Analyze Page"

**Solution:**
1. Check browser console (F12) for errors
2. Ensure `windows` permission is in manifest.json
3. Reload the extension: about:debugging → Reload button

### "Extracting page content..." Never Finishes
**Problem:** Status stays at extraction stage

**Solution:**
1. Open about:debugging
2. Check background script console for errors
3. Ensure LM Studio is running: `curl http://localhost:1234/api/status`
4. Try refreshing the current page and analyzing again

### Results Window Opens but Stays Blank
**Problem:** Window opens but shows empty content

**Solution:**
1. Check browser console (F12) in the results window
2. Check background script console in about:debugging
3. Ensure results.html and results.js are in dist-firefox/
4. Run: `npm run build:firefox` to rebuild

### "Error: Could not extract page content"
**Problem:** Content script isn't loading

**Solution:**
1. Try refreshing the page you're analyzing
2. Results window will show error with Retry button
3. Click Retry to try again

### LLM Takes Too Long (timeout)
**Problem:** Background script times out after 60 seconds

**Solution:**
1. LM Studio models are slow (10-60 seconds per request)
2. Try with a smaller model
3. Ensure LM Studio has enough free memory

## What You're Testing

- ✅ Window creation via `chrome.windows.create()`
- ✅ Real-time message passing between popup → background → results window
- ✅ Status updates sent to results window
- ✅ Final results displayed with provider info
- ✅ Copy to clipboard functionality
- ✅ Error handling with retry mechanism
- ✅ UI state management (loading → result → success)

## Expected Console Output

In the **background script console** (about:debugging → background):

```
[LLM] Analysis request received, results window ID: 12345
[LLM] Analyzing with lm-studio provider...
[LLM] Model: zai-org/glm-4.6v-flash
[LLM] Prompt length: 5316 chars
[LLM] Sending request to http://localhost:1234/v1/chat/completions
[LLM] Response status: 200
[LLM] Success! Analysis length: 1421 chars
```

## Advanced Testing

### Test with Different Providers

1. Open extension settings
2. Switch to a different provider (Ollama, OpenAI, Anthropic)
3. Configure the endpoint/API key
4. Click "Test Connection" to verify
5. Analyze a page - results window should show new provider info

### Test Error Handling

1. Close LM Studio while analysis is running
2. Results window should show error message
3. Click "Retry" button
4. Should show "Connection refused" or similar

### Test Copy Functionality

1. After results appear, click "Copy"
2. Open a text editor
3. Paste (Cmd+V or Ctrl+V)
4. Full analysis should be in clipboard

## UI States Reference

### Loading State
- Spinning circle icon (⟳ rotating)
- Text: "Extracting page content..." or "Sending to LLM server..."

### Success State
- Status section hidden
- Results section visible
- Gray box with provider info at top
- Analysis text with proper line breaks
- Copy button enabled

### Error State
- Status section hidden
- Results section hidden
- Error section visible with ⚠️ icon
- Red error message text
- Red "Retry" button

## Performance Notes

- **Window open time**: ~100-200ms
- **Popup close time**: Immediate
- **Content extraction**: 1-2 seconds
- **LLM processing**: 10-60 seconds (depends on model)
- **Total time**: ~15-65 seconds from click to results

## Architecture Verification

The message flow should be:
1. **Popup** creates window → sends analysis request with windowId
2. **Background** receives request → sends updateStatus messages
3. **Results Window** receives messages → updates UI
4. **Background** completes analysis → sends result message
5. **Results Window** receives result → displays analysis

If any step fails, an error message appears with retry option.

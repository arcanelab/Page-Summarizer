# Debug Steps for Results Window Issue

## What I Fixed

1. **Added detailed logging** in background script to see:
   - Complete request payload
   - Content validation
   - LLM configuration
   
2. **Fixed message sending** from background to results window:
   - Created `sendMessageToResultsWindow()` helper function
   - Ensured messages are sent using `chrome.runtime.sendMessage()` which broadcasts to all extension pages
   - Added proper error handling for messaging

3. **Made message sending synchronous** instead of using setTimeout, so status updates happen in proper order

## How to Debug

### Step 1: Reload the Extension
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Reload** on Local Summarizer
3. Click **Inspect** to open the background script console

### Step 2: Test the Analysis Flow
1. Open any website (e.g., https://example.com)
2. Click the extension icon
3. Click "Analyze Page"
4. Watch the background script console

### Step 3: Check Expected Logs

In the **background script console**, you should see:

```
[LLM] Analysis request received, results window ID: <number>
[LLM] Request payload: { ... full request object ... }
[LLM] Content validated, text length: <number>
[LLM] LLM Config: { ... your LLM configuration ... }
[LLM] Analyzing with lm-studio provider...
[LLM] Model: <your-model-name>
[LLM] Prompt length: <number> chars
[LLM] Sent message to results window: updateStatus
[LLM] Sending request to http://localhost:1234/v1/...
[LLM] Using chat format (or completions format)
[LLM] Response status: 200
[LLM] Success! Analysis length: <number> chars
[LLM] Sent message to results window: result
```

### Step 4: Identify the Problem

Check where the logs stop:

#### If it stops at "Analysis request received"
- The content might be invalid
- Look for "Request payload" to see what was sent
- Check if `content` has `text` and `images` properties

#### If it stops at "Content validated"
- LLM config might be missing or invalid
- Look at "LLM Config" log to see what's configured
- Go to Settings and verify your LLM configuration

#### If it stops at "Sending request to..."
- The LLM server isn't responding
- **Test LM Studio manually:**

```bash
# In terminal, test if LM Studio is running:
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-name",
    "messages": [{"role": "user", "content": "test"}],
    "stream": false
  }'
```

#### If it stops at "Response status: XXX" with error
- The LLM returned an error
- Check the HTTP status code
- Look for "HTTP error response:" log

### Step 5: Check Results Window Console

1. When the results window opens, **right-click anywhere** in it
2. Select **Inspect Element** to open DevTools
3. Go to **Console** tab
4. You should see:
   ```
   Results page loaded
   ```
5. When messages arrive, you won't see logs (we can add them)

### Step 6: Verify LM Studio is Running

1. Open LM Studio application
2. Go to **Local Server** tab
3. Ensure a model is loaded
4. Check the server is running (you should see a green indicator)
5. Note the port (usually `1234`)
6. Note the endpoint format being used:
   - Chat: `/v1/chat/completions`
   - Completions: `/v1/completions`

### Step 7: Verify Extension Settings

1. Right-click extension icon → **Options**
2. Check:
   - Provider: `LM Studio`
   - Endpoint: Should match LM Studio (e.g., `http://localhost:1234/v1/chat/completions`)
   - Model: Should match the model loaded in LM Studio
   - Temperature: 0.7 (or your preference)
3. Click **Test Connection**
4. Should show success message

## Common Issues

### Issue: "Invalid page content received"
**Solution:** The content script isn't extracting content properly. Check:
- Is the page a regular web page? (not `about:*`, `file://`, etc.)
- Refresh the page and try again
- Check browser console (F12) on the page for content script errors

### Issue: "Local LLM endpoint not configured"
**Solution:** 
1. Go to extension Options
2. Enter the correct LM Studio endpoint
3. Save settings
4. Try again

### Issue: "HTTP 404" or "HTTP 500"
**Solution:**
- Wrong endpoint URL in settings
- Model not loaded in LM Studio
- LM Studio server not started

### Issue: Request timeout after 60 seconds
**Solution:**
- Model is too slow
- LM Studio doesn't have enough memory
- Try a smaller/faster model

### Issue: "Could not send message to results window"
**Solution:**
- Results window closed before message arrived (rare)
- Check if results window is still open

## Advanced Debugging

### Add Logging to Results Window

Edit `src/results/results.ts` and add console logs:

```typescript
// Listen for messages from background script
chrome.runtime.onMessage.addListener((request) => {
  console.log('Results: Received message:', request)  // ADD THIS LINE
  
  if (request.action === 'updateStatus') {
    console.log('Results: Updating status to:', request.status)  // ADD THIS LINE
    setStatus(request.status)
  } else if (request.action === 'result') {
    console.log('Results: Showing result')  // ADD THIS LINE
    const result = request.result as AnalysisResult
    showResult(result)
  } else if (request.action === 'error') {
    console.log('Results: Showing error:', request.error)  // ADD THIS LINE
    const error = request.error as string
    showError(error)
  }
})
```

Then rebuild: `npm run build:firefox`

## What to Report

If it still doesn't work, collect this info:

1. **Background console logs** (all of them from clicking "Analyze Page")
2. **Results window console logs** (open DevTools on results window)
3. **LM Studio configuration:**
   - Model name
   - Endpoint URL
   - Is server running?
4. **Extension settings:**
   - Provider
   - Endpoint
   - Model
5. **Result of testing LM Studio manually** (using curl command above)

This will help identify exactly where the problem is!

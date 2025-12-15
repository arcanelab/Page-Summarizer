# Troubleshooting Guide

## Issue: "Receiving end does not exist" error

This means the content script isn't receiving messages. Follow these steps:

### Step 1: Check Browser Consoles

**Background Script Console:**
1. Go to `about:debugging#/runtime/this-firefox` in Firefox
2. Click "Inspect" on the Local Summarizer extension
3. You'll see a console with logs from the background script

**Content Script Console:**
1. Open any webpage
2. Press F12 to open DevTools
3. Go to the Console tab
4. Look for logs starting with "Content script:"

### Step 2: Reload the Extension

1. Go to `about:debugging#/runtime/this-firefox`
2. Click the "Reload" button on Local Summarizer
3. Then try analyzing a page again

### Step 3: Check Content Script is Loaded

1. Open any webpage
2. Press F12 (DevTools)
3. Go to Console
4. You should see a message: **"Content script: Loading..."** and **"Content script: Message listener registered"**

If you don't see these messages:
- The content script failed to load
- Check for errors in the console
- The page might be a special page (about:*, extension pages, etc.) where content scripts can't run

### Step 4: Test LM Studio Connection

**Option A: Test from Browser Console**

1. Open `about:debugging` in Firefox
2. Click "Inspect" on the extension
3. In the background script console, paste this:

```javascript
fetch('http://localhost:1234/v1/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'your-model-name',
    prompt: 'Hello',
    stream: false
  })
})
.then(r => r.json())
.then(d => console.log('Success:', d))
.catch(e => console.error('Failed:', e))
```

**Option B: Test from Terminal**

```bash
curl -X POST http://localhost:1234/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"your-model","prompt":"Hello","stream":false}'
```

If this fails:
- LM Studio isn't running
- The endpoint is wrong
- The model name doesn't match

### Step 5: Check Network/Permissions

Firefox extensions need permission to access localhost. The manifest includes:
```json
"optional_permissions": ["http://localhost/*"]
```

If you get permission errors:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Permissions" on the extension
3. Ensure localhost access is granted

## Common Issues & Solutions

### "Testing connection..." hangs (Settings Page)

**Cause:** The fetch to LM Studio is timing out

**Solution:**
```bash
# Check if LM Studio is actually running
curl http://localhost:1234/api/status

# If nothing responds, start LM Studio or use correct port
# LM Studio defaults to port 1234 when server is started
```

### "Error: HTTP 404" when testing

**Cause:** Wrong endpoint URL

**LM Studio endpoints:**
- Completions: `http://localhost:1234/v1/completions`
- Chat: `http://localhost:1234/v1/chat/completions`
- Status: `http://localhost:1234/api/status`

Check which one your model expects in LM Studio UI.

### Content script says "Error getting page content"

**Cause:** Page content extraction failed

**Solution:**
1. Verify the page has text/images to extract
2. Try on a simpler page (like google.com)
3. Check DevTools console for extraction errors

### "Sending to LLM..." but hangs forever

**Cause:** Background script sent request to LM Studio but got no response

**Debug:**
1. Open background script console (about:debugging → Inspect)
2. Look for logs starting with `[LLM]`
3. Check the URL and model name are correct
4. Verify LM Studio is actually listening: `curl http://localhost:1234/api/status`

### "Background script error" message

**Solution:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Inspect" on the extension
3. Check the console for detailed error messages
4. The error will give you more info than the popup message

## Full Debug Workflow

**When something fails, follow this order:**

```
1. Reload extension in about:debugging
2. Open DevTools on a webpage (F12)
3. Click extension icon → "Analyze Page"
4. Check console logs:
   - Popup logs (should see "Popup: ..." messages)
   - Content script logs (should see "Content script: ..." messages)
   - Background script logs (should see "[LLM]" messages)
5. Fix based on which step fails first
```

## Viewing Extension Errors

**Background Script Errors:**
```
about:debugging → Local Summarizer → Inspect → Console
(This shows what's running in the background)
```

**Content Script Errors:**
```
Open webpage → F12 → Console
(This shows errors from the content script)
```

**Popup Errors:**
```
Click extension icon → F12 on popup → Console
(This shows popup JavaScript errors)
```

**Options Page Errors:**
```
Right-click extension → Options → F12 → Console
(This shows settings page errors)
```

## Testing Checklist

- [ ] LM Studio is running: `curl http://localhost:1234/api/status`
- [ ] Model is loaded in LM Studio
- [ ] Extension is reloaded in about:debugging
- [ ] Content script is loaded on webpage (see "Content script: Loading..." in F12 console)
- [ ] Settings page shows correct endpoint: `http://localhost:1234/v1/completions`
- [ ] Test Connection button shows success (or specific error)
- [ ] Simple webpage (not special page) is open
- [ ] No errors in background script console (about:debugging → Inspect)

## Still Stuck?

Collect this information:

```
1. Full endpoint URL you're using
2. Model name in LM Studio
3. Error message from popup
4. All console messages (background, content, popup)
5. Result of: curl http://localhost:1234/api/status
```

Then check the [Architecture document](./ARCHITECTURE.md) for how the message flow works.

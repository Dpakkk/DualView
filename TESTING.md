# Testing DualView Live Preview

## Quick Start Testing

### 1. Launch Extension Development Host

```bash
# Press F5 in VS Code
# Or run:
code --extensionDevelopmentPath=/Users/bikashpokharel/Desktop/untitled\ folder/DualView
```

### 2. Configure Clerk (First Time Only)

In the Extension Development Host window:
1. Open Settings (`Cmd+,`)
2. Search "dualview"
3. Add your Clerk Publishable Key:
   ```
   dualview.clerkPublishableKey: pk_test_YOUR_KEY
   ```

### 3. Test Authentication Flow

1. Extension activates automatically
2. You should see sign-in prompt
3. Click "Sign In"
4. Complete Clerk authentication
5. Should see "Welcome back to DualView!"

### 4. Test Auto-Detection

**Test with Vite:**
```bash
# In a test project
npm create vite@latest test-app
cd test-app
npm install
npm run dev
```

Expected behavior:
- DualView detects server on port 5173
- Shows notification: "Dev server detected on http://localhost:5173"
- Click "Open DualView"
- Dual preview opens with mobile + desktop views

**Test with Next.js:**
```bash
npx create-next-app@latest test-next
cd test-next
npm run dev
```

Expected behavior:
- Detects on port 3000
- Auto-prompts to open

**Test with Python Flask:**
```python
# app.py
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return '<h1>Hello DualView!</h1>'

if __name__ == '__main__':
    app.run(debug=True)
```

```bash
python app.py
```

Expected behavior:
- Detects on port 5000
- Opens preview

### 5. Test Manual Commands

**Open Preview (QuickPick):**
1. `Cmd+Shift+P` → "DualView: Open Preview"
2. Select "Attach to running server (auto-detect)"
3. Should find any running server

**Manual URL:**
1. `Cmd+Shift+P` → "DualView: Attach to URL"
2. Enter: `http://localhost:3000`
3. Preview opens

**Serve Current Folder:**
1. Open a folder with `index.html`
2. `Cmd+Shift+P` → "DualView: Serve Current Folder"
3. Static server starts
4. Preview opens

### 6. Test Webview Features

**Reload:**
- Click 🔄 Reload button
- Both frames should refresh

**Rotate Mobile:**
- Click 📱 Rotate button
- Mobile viewport should rotate (430×932 → 932×430)
- Click again to rotate back

**Pop-out:**
- Click 🌐 Pop Out button
- Should open browser with same dual view
- URL: `http://localhost:7777?url=...`

**URL Input:**
- Type new URL in toolbar input
- Press Enter
- Both frames should load new URL

### 7. Test Status Bar

- Click 📱 DualView status bar item
- Should reopen last preview
- Status bar updates with port number

### 8. Test Settings

```json
{
  "dualview.autoOpenOnUrl": false,
  "dualview.autoOpenOnProbe": false,
  "dualview.mobileSize": "375x667",
  "dualview.desktopSize": "1920x1080"
}
```

- Disable auto-open → should not auto-prompt
- Change sizes → preview should use new sizes

### 9. Test Logout

1. `Cmd+Shift+P` → "DualView: Sign Out"
2. Should sign out
3. Preview panel should close
4. Next command should prompt for sign-in

## Edge Cases to Test

### Multiple Servers
```bash
# Terminal 1
npm run dev        # Port 5173

# Terminal 2
python -m http.server 8000

# Should detect both, prompt for each
```

### Port Already in Use
```bash
# Start server on 7777 (default pop-out port)
python -m http.server 7777

# Try pop-out → should auto-increment to 7778
```

### No Workspace
- Close all folders
- Try "Serve Current Folder"
- Should show error: "No workspace folder open"

### Invalid URL
- Use "Attach to URL"
- Enter: "not-a-url"
- Should show validation error

### Server Stops
- Start server → open preview
- Stop server → frames show error
- Restart server → manual reload should work

## Performance Testing

### Many Ports
Add many ports to probe:
```json
{
  "dualview.probe.ports": [3000, 3001, 3002, ..., 9999]
}
```

Should still be performant (probes in parallel).

### Large HTML
Serve large HTML file (>5MB)
- Should load without crashing
- Both frames should render

### Rapid Reloads
- Click reload rapidly 10+ times
- Should handle gracefully

## Security Testing

### HTTPS URLs
Try: `https://localhost:3000`
- Should work if cert is trusted
- Otherwise shows security warning

### External URLs
Try: `https://google.com`
- Input validation should reject
- Only localhost/127.0.0.1 allowed

### XSS Attempts
Try URL: `http://localhost:3000/<script>alert('xss')</script>`
- CSP should block
- No alerts should appear

## Known Limitations

1. **Terminal Output Detection**: VS Code API doesn't expose terminal stdout, so we rely on port probing and task hooks. This is why we have the aggressive probing strategy.

2. **CORS Issues**: Some dev servers have strict CORS. Iframes may fail to load. Users should configure their dev server to allow iframe embedding.

3. **Large Viewports**: Very large desktop sizes may cause scrolling. This is by design for accurate preview.

4. **Pop-out Server**: Runs on localhost only. Not accessible from network.

## Debugging

Enable extension host developer tools:
1. `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
2. Check console for logs
3. Look for errors in extension host

Check compiled output:
```bash
ls -la out/
cat out/extension.js
```

Re-compile:
```bash
npm run compile
```

## Success Criteria

✅ Authentication works end-to-end
✅ Auto-detection works for Vite, Next, Flask
✅ All commands execute without errors
✅ Webview renders both frames correctly
✅ Pop-out opens in browser
✅ Settings affect behavior
✅ Status bar works
✅ No console errors in normal usage
✅ Clean disposal (no memory leaks)

## Report Issues

If you find bugs, please report with:
- Steps to reproduce
- VS Code version
- Extension version
- Console errors
- Screenshots

---

**Happy Testing! 🚀**


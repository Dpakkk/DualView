# DualView Live Preview

A VS Code extension that automatically detects local development servers and displays synchronized mobile and desktop previews with Clerk authentication.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85.0%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Dual Viewport Preview
- **Mobile**: iPhone 14 Pro Max (430×932px)
- **Desktop**: MacBook 13" (1440×900px)
- **Synchronized**: Both views load the same URL simultaneously
- **Configurable**: Customize viewport sizes in settings

### Auto-Detection
- **Terminal Monitoring**: Detects dev server URLs from terminal output patterns
- **Port Probing**: Automatically scans common development ports
- **Task Integration**: Hooks into VS Code tasks to detect "dev" commands
- **Smart Prompting**: Shows notification when a server is detected

### Multiple Attach Modes
1. **Auto-detect** - Scan common ports (5173, 3000, 8080, etc.)
2. **Manual URL** - Enter any localhost/127.0.0.1 URL
3. **Static Server** - Serve current folder as static files

### Clerk Authentication
- Required login before using any features
- Secure session storage using VS Code secrets API
- Persistent authentication across restarts

### Pop-out to Browser
- Opens identical dual-view in external browser
- Runs mini HTTP server for pop-out functionality
- Perfect for multi-monitor setups
- Customizable port configuration

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "DualView Live Preview"
4. Click Install

### From VSIX
```bash
code --install-extension dualview-0.1.0.vsix
```

## Setup

### 1. Configure Clerk Authentication

**Get your Clerk Publishable Key:**
1. Sign up at [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Go to API Keys
4. Copy your Publishable Key (starts with `pk_test_` or `pk_live_`)

**Add to VS Code Settings:**

Open Settings (`Cmd/Ctrl + ,`) and search for "DualView", then paste your key:
```json
{
  "dualview.clerkPublishableKey": "pk_test_YOUR_KEY_HERE"
}
```

### 2. Sign In
- Extension will prompt for sign-in on first use
- Complete Clerk authentication flow
- Stay signed in across VS Code restarts

## Usage

### Auto-Detection (Recommended)
1. Start your dev server normally:
   ```bash
   npm run dev        # Vite, Next.js
   python app.py      # Flask
   rails server       # Rails
   ng serve          # Angular
   ```
2. DualView automatically detects the server
3. Click "Open DualView" in the notification
4. Preview opens instantly

### Manual Commands

| Command | Description |
|---------|-------------|
| `DualView: Open Preview` | Opens QuickPick with all attach options |
| `DualView: Attach to URL` | Manually enter a URL |
| `DualView: Serve Current Folder` | Start static server for workspace |
| `DualView: Open Last Preview` | Reopen last used preview |
| `DualView: Sign Out` | Sign out of Clerk |

### Status Bar
Click the DualView status bar button to quickly reopen last preview.

## Configuration

```jsonc
{
  // Clerk authentication
  "dualview.clerkPublishableKey": "",

  // Auto-detection
  "dualview.autoOpenOnUrl": true,           // Prompt when URL detected
  "dualview.autoOpenOnProbe": true,         // Auto-probe common ports
  "dualview.probe.ports": [5173, 3000, 8080, 4200, 5000, 5500, 8000, 8001],

  // Viewport sizes
  "dualview.mobileSize": "430x932",         // iPhone 14 Pro Max
  "dualview.desktopSize": "1440x900",       // MacBook 13"

  // Pop-out feature
  "dualview.popout.enable": true,
  "dualview.popout.port": 7777              // Preferred port (auto-increments if busy)
}
```

### Supported Frameworks

DualView automatically detects servers from:

| Framework | Default Port | Pattern |
|-----------|--------------|---------|
| Vite | 5173 | `Local: http://localhost:5173` |
| Next.js | 3000 | `http://localhost:3000` |
| React (CRA) | 3000 | `webpack compiled` |
| Angular | 4200 | `Angular Live Development Server` |
| Vue | 8080 | `App running at` |
| Flask | 5000 | `Running on http://127.0.0.1:5000` |
| Django | 8000 | `Starting development server at` |
| Rails | 3000 | `Listening on http://localhost:3000` |
| Express | 3000+ | Custom ports |

## Features in Detail

### Toolbar Actions
- **URL Input**: Edit and navigate to any localhost URL
- **Reload**: Refresh both frames simultaneously
- **Rotate**: Toggle mobile orientation (portrait and landscape)
- **Pop Out**: Open in external browser

### Auto-Detection Strategy
1. **Task Hook**: Detects when "dev", "serve", or "start" tasks run
2. **Port Probe**: Checks common ports every 2s (500ms when task starts)
3. **Terminal Monitor**: Watches for new terminal creation
4. **Smart Prompting**: Only prompts once per detected URL

### Security Features
- Clerk authentication required
- Session tokens encrypted in VS Code secrets
- Only publishable keys used (no secret keys)
- CSP restrictions on webviews
- Localhost/127.0.0.1 only for iframes

## Architecture

```
src/
├── extension.ts              # Main activation, commands, orchestration
├── detector.ts               # Terminal sniffer + port probe logic
├── server.ts                 # Pop-out HTTP server + static file server
├── util.ts                   # Helper functions (URL parsing, port check)
├── auth/
│   └── auth-clerk.ts         # Clerk authentication provider
└── webview/
    ├── dualview.html         # Main dual-iframe preview UI
    ├── login.html            # Clerk sign-in UI
    └── previewPanel.ts       # Webview panel manager
```

## Development

### Prerequisites
- Node.js 18+
- VS Code 1.85.0+
- TypeScript 5.3+

### Setup
```bash
git clone https://github.com/yourusername/dualview.git
cd dualview
npm install
```

### Development Workflow
```bash
# Watch mode
npm run watch

# Compile
npm run compile

# Launch extension (F5 in VS Code)
# Opens Extension Development Host
```

### Testing
1. Run `npm run dev` in a test project (e.g., Vite)
2. Press `F5` to launch extension
3. DualView should auto-detect and prompt
4. Test all commands and features

### Building
```bash
# Package extension
npm run package
# Creates: dualview-0.1.0.vsix

# Publish to marketplace
npm run publish
```

## Troubleshooting

### "Configuration Required" Error
Add your Clerk publishable key to settings.

### Server Not Detected
Manually use `DualView: Attach to URL` or check that the port is listed in `dualview.probe.ports` setting.

### Pop-out Not Working
Check that your firewall allows localhost connections or try a different port in `dualview.popout.port`.

### Authentication Issues
Verify your Clerk key is valid, try signing out and back in, or check Clerk dashboard for application status.

## Limitations

- **Terminal Output**: VS Code API doesn't expose terminal stdout, so detection relies on port probing and task hooks
- **Localhost Only**: For security, only localhost/127.0.0.1 URLs are supported in iframes
- **HTTPS Servers**: May require additional CORS configuration

## Contributing

Contributions are welcome. Please fork the repository, create a feature branch, make your changes, and submit a pull request.

## License

MIT License - see LICENSE file

## Credits

- **Clerk**: Authentication platform ([clerk.com](https://clerk.com))
- **VS Code**: Extension APIs
- **Community**: Feedback and contributions

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/dualview/issues)
- **Docs**: [Clerk Documentation](https://clerk.com/docs)
- **VS Code**: [Extension API Docs](https://code.visualstudio.com/api)

## Roadmap

- More device presets (iPad, Pixel, etc.)
- Custom viewport sizes per workspace
- Screenshot capture
- Network throttling simulation
- DevTools integration
- Multi-URL comparison mode

---

Built for developers who care about responsive design.

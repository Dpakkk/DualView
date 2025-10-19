# DualView

A VS Code extension with dual panel view and Clerk authentication. **Authentication is required** - users must sign in before accessing any features.

## 🔐 Authentication Flow

When users install and activate DualView:
1. **Forced login on first use** - Extension prompts for sign-in immediately
2. **Secure session storage** - Credentials stored in VS Code's secure secrets API
3. **Persistent authentication** - Users stay logged in across VS Code restarts
4. **Protected features** - All extension features require authentication

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Clerk

**Get your Clerk Publishable Key:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select existing one
3. Navigate to **API Keys** page
4. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

**Configure in VS Code:**

Open VS Code Settings (JSON) and add:
```json
{
  "dualview.clerkPublishableKey": "pk_test_YOUR_PUBLISHABLE_KEY_HERE"
}
```

Or use the UI:
- Open Settings (`Cmd/Ctrl + ,`)
- Search for "DualView"
- Paste your Clerk Publishable Key

**⚠️ IMPORTANT:** Never commit your actual keys to version control. Add them to `.gitignore`.

### 3. Build the Extension
```bash
npm run compile
```

### 4. Run the Extension
- Press `F5` to open a new VS Code window with the extension loaded
- The extension will **automatically prompt for sign-in** on activation
- After signing in, use command: **"DualView: Open"** to access the main view

## 📋 Commands

- **DualView: Open** - Opens the dual panel view (requires authentication)
- **DualView: Sign Out** - Signs out and closes all DualView panels

## 🏗️ Project Structure

```
├── src/
│   ├── extension.ts              # Main extension entry point (handles auth flow)
│   ├── auth/
│   │   └── clerkProvider.ts      # Clerk authentication provider
│   └── webview/
│       └── dualViewPanel.ts      # Dual panel webview (auth-protected)
├── package.json                  # Extension manifest with activation events
└── tsconfig.json                 # TypeScript configuration
```

## 🔧 Development

- `npm run watch` - Watch for changes and compile
- `npm run compile` - Compile TypeScript
- `npm run lint` - Run ESLint

## 🛠️ Tech Stack

- **TypeScript** - Type-safe development
- **VS Code Extension API** - Extension framework
- **Clerk Authentication** - Modern auth with Clerk.js browser SDK
- **Vanilla HTML/CSS/JS** - Lightweight webviews
- **VS Code Secrets API** - Secure credential storage

## 🔒 Security Features

- ✅ Authentication enforced on extension activation
- ✅ Session tokens stored in VS Code's encrypted secrets storage
- ✅ Publishable keys (not secret keys) used in webviews
- ✅ Secure CSP policies for webviews
- ✅ No hardcoded credentials in source code

## 📝 How It Works

1. **Extension activates** on VS Code startup (`onStartupFinished`)
2. **Checks authentication status** - If not authenticated, shows sign-in prompt
3. **Clerk webview opens** - Uses Clerk.js browser SDK for authentication UI
4. **Session stored securely** - Token saved in VS Code secrets storage
5. **Features unlocked** - User can now access DualView panels
6. **Session persists** - Remains authenticated across restarts until explicit sign-out

## 🎯 For End Users

After installing DualView from the marketplace:

1. **First Launch**: You'll be prompted to sign in immediately
2. **Configure Clerk Key**: If not configured, you'll see setup instructions
3. **Sign In**: Complete authentication through Clerk's interface
4. **Use Extension**: Access "DualView: Open" command to start using the extension
5. **Stay Signed In**: Your session persists across VS Code restarts

## 📚 Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [VS Code Extension API](https://code.visualstudio.com/api)

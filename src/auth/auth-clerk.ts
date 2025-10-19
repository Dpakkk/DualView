import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ClerkSession {
  id: string;
  token: string;
}

export interface ClerkUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

export class ClerkAuthProvider {
  private context: vscode.ExtensionContext;
  private readonly SESSION_KEY = 'dualview.clerkSession';
  private readonly USER_KEY = 'dualview.userData';
  private authPanel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  async login(): Promise<boolean> {
    return new Promise((resolve) => {
      // Prevent multiple login panels
      if (this.authPanel) {
        this.authPanel.reveal();
        return;
      }

      // Create authentication webview
      this.authPanel = vscode.window.createWebviewPanel(
        'dualviewAuth',
        'Sign In - DualView Live Preview',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      this.authPanel.webview.html = this.getLoginHtml();

      // Handle messages from webview
      const messageDisposable = this.authPanel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case 'authSuccess':
              await this.handleAuthSuccess(message.session, message.user);
              vscode.window.showInformationMessage('✅ Successfully signed in to DualView!');
              this.authPanel?.dispose();
              this.authPanel = undefined;
              resolve(true);
              break;
            case 'authError':
              vscode.window.showErrorMessage(`Authentication failed: ${message.error}`);
              break;
            case 'authCancelled':
              this.authPanel?.dispose();
              this.authPanel = undefined;
              resolve(false);
              break;
          }
        }
      );

      // Handle panel disposal
      this.authPanel.onDidDispose(() => {
        messageDisposable.dispose();
        this.authPanel = undefined;
        resolve(false);
      });
    });
  }

  async logout(): Promise<void> {
    await this.context.secrets.delete(this.SESSION_KEY);
    await this.context.globalState.update(this.USER_KEY, undefined);
    vscode.window.showInformationMessage('Signed out of DualView');
  }

  async getSession(): Promise<ClerkSession | undefined> {
    const sessionJson = await this.context.secrets.get(this.SESSION_KEY);
    return sessionJson ? JSON.parse(sessionJson) : undefined;
  }

  async getUser(): Promise<ClerkUser | undefined> {
    return await this.context.globalState.get<ClerkUser>(this.USER_KEY);
  }

  private async handleAuthSuccess(session: ClerkSession, user: ClerkUser): Promise<void> {
    await this.context.secrets.store(this.SESSION_KEY, JSON.stringify(session));
    await this.context.globalState.update(this.USER_KEY, user);
  }

  private getLoginHtml(): string {
    const config = vscode.workspace.getConfiguration('dualview');
    const clerkPublishableKey = config.get<string>('clerkPublishableKey') || '';

    if (!clerkPublishableKey) {
      return this.getConfigurationErrorHtml();
    }

    // Read the login HTML template (try src first for development, then packaged location)
    let loginHtmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'login.html');
    
    if (!fs.existsSync(loginHtmlPath)) {
      // Fallback to packaged location
      loginHtmlPath = path.join(this.context.extensionPath, 'out', 'webview', 'login.html');
    }

    if (!fs.existsSync(loginHtmlPath)) {
      return this.getFileNotFoundHtml();
    }

    let html = fs.readFileSync(loginHtmlPath, 'utf-8');

    // Replace placeholder with actual key
    html = html.replace('CLERK_PUBLISHABLE_KEY_PLACEHOLDER', clerkPublishableKey);

    return html;
  }

  private getConfigurationErrorHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #1e1e1e;
      color: #cccccc;
    }
    .error-container {
      text-align: center;
      padding: 40px;
      max-width: 500px;
    }
    h1 {
      color: #f48771;
      margin-bottom: 20px;
    }
    p {
      line-height: 1.6;
      margin-bottom: 15px;
    }
    code {
      background: #2d2d2d;
      padding: 2px 8px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    .steps {
      text-align: left;
      margin-top: 30px;
    }
    .steps li {
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>⚠️ Configuration Required</h1>
    <p>DualView requires a Clerk Publishable Key to function.</p>
    <div class="steps">
      <h3>Setup Steps:</h3>
      <ol>
        <li>Sign up at <a href="https://dashboard.clerk.com" target="_blank">dashboard.clerk.com</a></li>
        <li>Create a new application</li>
        <li>Go to API Keys</li>
        <li>Copy your Publishable Key (starts with <code>pk_test_</code>)</li>
        <li>Open VS Code Settings (Cmd+,)</li>
        <li>Search for "dualview"</li>
        <li>Paste your key into <code>dualview.clerkPublishableKey</code></li>
        <li>Reload VS Code window</li>
      </ol>
    </div>
  </div>
</body>
</html>`;
  }

  private getFileNotFoundHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #1e1e1e;
      color: #cccccc;
    }
    .error-container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      color: #f48771;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>⚠️ Extension Error</h1>
    <p>Login template file not found. Please reinstall the extension.</p>
  </div>
</body>
</html>`;
  }

  dispose() {
    if (this.authPanel) {
      this.authPanel.dispose();
      this.authPanel = undefined;
    }
  }
}

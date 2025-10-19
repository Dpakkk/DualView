import * as vscode from 'vscode';

export class ClerkAuthProvider {
  private context: vscode.ExtensionContext;
  private readonly AUTH_SESSION_KEY = 'dualview.clerkSession';
  private readonly USER_DATA_KEY = 'dualview.userData';
  private authPanel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.context.secrets.get(this.AUTH_SESSION_KEY);
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
        'Sign In - DualView',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      this.authPanel.webview.html = this.getAuthWebviewContent();

      // Handle messages from webview
      const messageDisposable = this.authPanel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case 'authSuccess':
              await this.handleAuthSuccess(message.session, message.user);
              vscode.window.showInformationMessage('Successfully signed in to DualView!');
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
    await this.context.secrets.delete(this.AUTH_SESSION_KEY);
    await this.context.globalState.update(this.USER_DATA_KEY, undefined);
    vscode.window.showInformationMessage('Successfully signed out of DualView');
  }

  async getSession(): Promise<string | undefined> {
    return await this.context.secrets.get(this.AUTH_SESSION_KEY);
  }

  async getUser(): Promise<any> {
    return await this.context.globalState.get(this.USER_DATA_KEY);
  }

  private async handleAuthSuccess(session: string, user: any): Promise<void> {
    await this.context.secrets.store(this.AUTH_SESSION_KEY, session);
    await this.context.globalState.update(this.USER_DATA_KEY, user);
  }

  private getAuthWebviewContent(): string {
    const config = vscode.workspace.getConfiguration('dualview');
    const clerkPublishableKey = config.get<string>('clerkPublishableKey');

    if (!clerkPublishableKey || clerkPublishableKey === '') {
      return this.getConfigurationErrorContent();
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; connect-src https://*.clerk.accounts.dev https://*.clerk.com; img-src https: data:;">
  <title>Sign In to DualView</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 20px;
    }
    #auth-container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header p {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }
    #clerk-sign-in {
      width: 100%;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--vscode-button-background);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      color: var(--vscode-errorForeground);
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      padding: 16px;
      border-radius: 6px;
      width: 100%;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="auth-container">
    <div class="header">
      <h1>Welcome to DualView</h1>
      <p>Sign in to continue</p>
    </div>
    <div id="clerk-sign-in">
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading authentication...</p>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script>
  <script>
    const vscode = acquireVsCodeApi();

    async function initializeClerk() {
      try {
        const clerkPublishableKey = '${clerkPublishableKey}';
        
        if (!clerkPublishableKey || clerkPublishableKey.startsWith('pk_') === false) {
          throw new Error('Invalid Clerk publishable key. Please configure it in VS Code settings.');
        }

        // Load Clerk
        const clerk = window.Clerk;
        await clerk.load({
          publishableKey: clerkPublishableKey
        });

        // Check if already signed in
        if (clerk.user) {
          const session = clerk.session;
          vscode.postMessage({
            command: 'authSuccess',
            session: session.id,
            user: {
              id: clerk.user.id,
              email: clerk.user.primaryEmailAddress?.emailAddress,
              firstName: clerk.user.firstName,
              lastName: clerk.user.lastName,
              imageUrl: clerk.user.imageUrl
            }
          });
          return;
        }

        // Mount sign-in component
        const signInDiv = document.getElementById('clerk-sign-in');
        signInDiv.innerHTML = '';
        
        clerk.mountSignIn(signInDiv, {
          appearance: {
            elements: {
              rootBox: 'clerk-root',
              card: 'clerk-card'
            }
          }
        });

        // Listen for authentication events
        clerk.addListener((resources) => {
          if (resources.user && resources.session) {
            vscode.postMessage({
              command: 'authSuccess',
              session: resources.session.id,
              user: {
                id: resources.user.id,
                email: resources.user.primaryEmailAddress?.emailAddress,
                firstName: resources.user.firstName,
                lastName: resources.user.lastName,
                imageUrl: resources.user.imageUrl
              }
            });
          }
        });

      } catch (error) {
        console.error('Clerk initialization error:', error);
        document.getElementById('clerk-sign-in').innerHTML = 
          '<div class="error"><strong>Authentication Error</strong><br>' + 
          error.message + '</div>';
        vscode.postMessage({
          command: 'authError',
          error: error.message
        });
      }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeClerk);
    } else {
      initializeClerk();
    }
  </script>
</body>
</html>`;
  }

  private getConfigurationErrorContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Configuration Required</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 20px;
    }
    .container {
      max-width: 600px;
      padding: 30px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
    }
    h1 {
      color: var(--vscode-errorForeground);
      margin-bottom: 16px;
    }
    p {
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .code {
      background: var(--vscode-textCodeBlock-background);
      padding: 12px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      margin: 16px 0;
      overflow-x: auto;
    }
    a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ol {
      margin-left: 20px;
      margin-top: 12px;
    }
    li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ Configuration Required</h1>
    <p>DualView requires a Clerk Publishable Key to enable authentication.</p>
    
    <h3>Setup Steps:</h3>
    <ol>
      <li>Go to <a href="https://dashboard.clerk.com">Clerk Dashboard</a></li>
      <li>Create a new application or select an existing one</li>
      <li>Navigate to <strong>API Keys</strong></li>
      <li>Copy your <strong>Publishable Key</strong> (starts with <code>pk_</code>)</li>
      <li>Open VS Code settings (Cmd/Ctrl + ,)</li>
      <li>Search for "DualView"</li>
      <li>Paste your key into <code>dualview.clerkPublishableKey</code></li>
    </ol>

    <p style="margin-top: 20px;">After configuration, restart the sign-in process.</p>
  </div>
</body>
</html>`;
  }
}

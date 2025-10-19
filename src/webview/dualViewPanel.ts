import * as vscode from 'vscode';
import { ClerkAuthProvider } from '../auth/clerkProvider';

export class DualViewPanel {
  public static currentPanel: DualViewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _authProvider: ClerkAuthProvider;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, authProvider: ClerkAuthProvider) {
    this._panel = panel;
    this._authProvider = authProvider;

    // Set webview content
    this._updateWebview();

    // Listen for panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'getUserInfo':
            const user = await this._authProvider.getUser();
            this._panel.webview.postMessage({
              command: 'userInfo',
              user: user
            });
            break;
          case 'alert':
            vscode.window.showInformationMessage(message.text);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, authProvider: ClerkAuthProvider) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    // If we already have a panel, show it
    if (DualViewPanel.currentPanel) {
      DualViewPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'dualView',
      'DualView',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    DualViewPanel.currentPanel = new DualViewPanel(panel, extensionUri, authProvider);
  }

  public static dispose() {
    DualViewPanel.currentPanel?.dispose();
  }

  public dispose() {
    DualViewPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async _updateWebview() {
    this._panel.webview.html = await this._getWebviewContent();
  }

  private async _getWebviewContent(): Promise<string> {
    const user = await this._authProvider.getUser();
    const userName = user?.firstName || user?.email || 'User';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:;">
  <title>DualView</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      overflow: hidden;
    }

    .header {
      padding: 12px 20px;
      background: var(--vscode-titleBar-activeBackground);
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 16px;
      font-weight: 600;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }

    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--vscode-button-background);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-button-foreground);
    }
    
    .container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .panel {
      flex: 1;
      padding: 20px;
      overflow: auto;
      border-right: 1px solid var(--vscode-panel-border);
    }

    .panel:last-child {
      border-right: none;
    }

    .panel-header {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-label {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .panel-content {
      line-height: 1.6;
    }

    .welcome-section {
      background: var(--vscode-input-background);
      padding: 20px;
      border-radius: 8px;
      border: 1px solid var(--vscode-panel-border);
      margin-bottom: 20px;
    }

    .welcome-section h2 {
      font-size: 16px;
      margin-bottom: 12px;
    }

    .welcome-section p {
      color: var(--vscode-descriptionForeground);
      line-height: 1.6;
    }

    .feature-list {
      list-style: none;
      padding: 0;
    }

    .feature-list li {
      padding: 12px;
      margin-bottom: 8px;
      background: var(--vscode-input-background);
      border-radius: 6px;
      border: 1px solid var(--vscode-panel-border);
    }

    .feature-list li strong {
      color: var(--vscode-editor-foreground);
    }

    @media (max-width: 768px) {
      .container {
        flex-direction: column;
      }
      .panel {
        border-right: none;
        border-bottom: 1px solid var(--vscode-panel-border);
      }
      .panel:last-child {
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DualView</h1>
    <div class="user-info">
      <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
      <span>${userName}</span>
    </div>
  </div>

  <div class="container">
    <div class="panel" id="left-panel">
      <div class="panel-header">
        <span>Left View</span>
        <span class="panel-label">Primary</span>
      </div>
      <div class="panel-content">
        <div class="welcome-section">
          <h2>👋 Welcome to DualView!</h2>
          <p>You're successfully authenticated and ready to use DualView. This is your primary workspace.</p>
        </div>
        
        <ul class="feature-list">
          <li><strong>Secure Authentication:</strong> Powered by Clerk for enterprise-grade security</li>
          <li><strong>Dual Panel Layout:</strong> Work with two views simultaneously</li>
          <li><strong>Persistent Sessions:</strong> Stay signed in across VS Code restarts</li>
        </ul>
      </div>
    </div>

    <div class="panel" id="right-panel">
      <div class="panel-header">
        <span>Right View</span>
        <span class="panel-label">Secondary</span>
      </div>
      <div class="panel-content">
        <div class="welcome-section">
          <h2>🚀 Getting Started</h2>
          <p>Use this panel for your secondary content. Perfect for comparisons, previews, or reference materials.</p>
        </div>

        <ul class="feature-list">
          <li><strong>Command:</strong> Use "DualView: Open" to launch this view</li>
          <li><strong>Sign Out:</strong> Use "DualView: Sign Out" to logout</li>
          <li><strong>Customizable:</strong> Extend this view with your own features</li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const vscode = acquireVsCodeApi();

      // Request user info from extension
      vscode.postMessage({
        command: 'getUserInfo'
      });

      // Listen for messages from extension
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
          case 'userInfo':
            console.log('User info received:', message.user);
            // You can update UI with user info here
            break;
        }
      });

      // Example: Add your custom vanilla TypeScript logic here
      console.log('DualView webview loaded and authenticated!');
    })();
  </script>
</body>
</html>`;
  }
}

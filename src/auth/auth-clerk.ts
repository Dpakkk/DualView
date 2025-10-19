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

    // Read the login HTML template
    const loginHtmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'login.html');
    let html = fs.readFileSync(loginHtmlPath, 'utf-8');

    // Replace placeholder with actual key
    html = html.replace('CLERK_PUBLISHABLE_KEY_PLACEHOLDER', clerkPublishableKey);

    return html;
  }

  dispose() {
    if (this.authPanel) {
      this.authPanel.dispose();
      this.authPanel = undefined;
    }
  }
}

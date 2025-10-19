import * as vscode from 'vscode';
import { ClerkAuthProvider } from './auth/clerkProvider';
import { DualViewPanel } from './webview/dualViewPanel';

let authProvider: ClerkAuthProvider;

export async function activate(context: vscode.ExtensionContext) {
  console.log('DualView extension is now active');

  // Initialize Clerk auth provider
  authProvider = new ClerkAuthProvider(context);

  // Check authentication on startup
  const isAuthenticated = await authProvider.isAuthenticated();
  
  if (!isAuthenticated) {
    // Force login on first use
    await promptForLogin();
  } else {
    vscode.window.showInformationMessage('Welcome back to DualView!');
  }

  // Register open command
  const openCommand = vscode.commands.registerCommand('dualview.open', async () => {
    const authenticated = await authProvider.isAuthenticated();
    
    if (!authenticated) {
      await promptForLogin();
      // Check again after login attempt
      const nowAuthenticated = await authProvider.isAuthenticated();
      if (!nowAuthenticated) {
        return; // User cancelled login
      }
    }

    // Show the dual view panel
    DualViewPanel.createOrShow(context.extensionUri, authProvider);
  });

  // Register logout command
  const logoutCommand = vscode.commands.registerCommand('dualview.logout', async () => {
    await authProvider.logout();
    // Close any open DualView panels
    DualViewPanel.dispose();
  });

  context.subscriptions.push(openCommand, logoutCommand);
}

async function promptForLogin(): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    'Please sign in to use DualView',
    'Sign In',
    'Cancel'
  );
  
  if (action === 'Sign In') {
    await authProvider.login();
  }
}

export function deactivate() {
  console.log('DualView extension is now deactivated');
}

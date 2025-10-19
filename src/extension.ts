import * as vscode from 'vscode';
import { PreviewPanel } from './webview/previewPanel';
import { ServerDetector } from './detector';
import { StaticServer } from './server';
import { isValidUrl } from './util';

let detector: ServerDetector;
let statusBarItem: vscode.StatusBarItem;
let staticServer: StaticServer | undefined;
let extensionContext: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log('DualView Live Preview extension is now active');

    // Store context globally
    extensionContext = context;

    // Initialize server detector
    detector = new ServerDetector(context);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'dualview.openLast';
    statusBarItem.text = '$(device-mobile) DualView';
    statusBarItem.tooltip = 'Open DualView Live Preview';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    registerCommands(context);

    // Dispose on deactivation
    context.subscriptions.push(
      detector,
      { dispose: () => staticServer?.stop() }
    );

    // Start server detection immediately
    startServerDetection();
    
  } catch (error) {
    console.error('DualView activation error:', error);
    vscode.window.showErrorMessage(`DualView failed to activate: ${error}`);
  }
}

function registerCommands(context: vscode.ExtensionContext) {
  // Main preview command with QuickPick
  const openPreviewCommand = vscode.commands.registerCommand('dualview.openPreview', async () => {

    const options = [
      {
        label: '$(search) Attach to running server (auto-detect)',
        description: 'Scan common ports for running dev servers',
        action: 'detect'
      },
      {
        label: '$(link) Enter URL manually',
        description: 'Manually specify the server URL',
        action: 'manual'
      },
      {
        label: '$(folder) Serve current folder (static)',
        description: 'Start a static HTTP server for the current workspace',
        action: 'serve'
      }
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'How would you like to preview?',
      matchOnDescription: true
    });

    if (!selected) {
      return;
    }

    switch (selected.action) {
      case 'detect':
        await attachToRunningServer();
        break;
      case 'manual':
        await attachToManualUrl();
        break;
      case 'serve':
        await serveCurrentFolder();
        break;
    }
  });

  // Attach to URL command
  const attachUrlCommand = vscode.commands.registerCommand('dualview.attachUrl', async () => {
    await attachToManualUrl();
  });

  // Serve folder command
  const serveFolderCommand = vscode.commands.registerCommand('dualview.serveFolder', async () => {
    await serveCurrentFolder();
  });

  // Open last preview command
  const openLastCommand = vscode.commands.registerCommand('dualview.openLast', async () => {

    const lastUrl = context.workspaceState.get<string>('lastUrl') || 
                    context.globalState.get<string>('lastUrl');
    
    if (lastUrl) {
      openPreview(lastUrl);
    } else {
      vscode.window.showInformationMessage('No previous preview found. Use "DualView: Open Preview" to start.');
      vscode.commands.executeCommand('dualview.openPreview');
    }
  });

  context.subscriptions.push(
    openPreviewCommand,
    attachUrlCommand,
    serveFolderCommand,
    openLastCommand
  );
}

function startServerDetection() {
  // Set up URL detection callback
  detector.onUrlDetected(async (url) => {
    const action = await vscode.window.showInformationMessage(
      `Dev server detected on ${url}`,
      'Open DualView',
      'Ignore'
    );
    
    if (action === 'Open DualView') {
      openPreview(url);
    }
  });

  // Start detection
  detector.startDetection();
}

async function attachToRunningServer() {
  const config = vscode.workspace.getConfiguration('dualview');
  const ports = config.get<number[]>('probe.ports', [5173, 3000, 8080, 4200, 5000, 5500, 8000, 8001]);
  
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Scanning for dev servers...',
    cancellable: false
  }, async () => {
    const { isPortOpen } = await import('./util');
    
    for (const port of ports) {
      const isOpen = await isPortOpen(port);
      if (isOpen) {
        const url = `http://localhost:${port}`;
        openPreview(url);
        return;
      }
    }
    
    vscode.window.showWarningMessage(
      'No dev server found on common ports. Try entering URL manually.',
      'Enter URL'
    ).then(action => {
      if (action === 'Enter URL') {
        attachToManualUrl();
      }
    });
  });
}

async function attachToManualUrl() {
  const url = await vscode.window.showInputBox({
    prompt: 'Enter the URL of your dev server',
    placeHolder: 'http://localhost:3000',
    validateInput: (value) => {
      if (!value) {
        return 'URL is required';
      }
      if (!isValidUrl(value)) {
        return 'Invalid URL format';
      }
      return null;
    }
  });

  if (url) {
    openPreview(url);
  }
}

async function serveCurrentFolder() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const folderPath = workspaceFolders[0].uri.fsPath;

  try {
    staticServer = new StaticServer();
    const url = await staticServer.serve(folderPath);
    
    vscode.window.showInformationMessage(`Static server started on ${url}`);
    openPreview(url);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start static server: ${error}`);
  }
}

function openPreview(url: string) {
  PreviewPanel.createOrShow(extensionContext, url);
  statusBarItem.text = `$(device-mobile) DualView: ${new URL(url).port}`;
}

export function deactivate() {
  detector?.stopDetection();
  staticServer?.stop();
  console.log('DualView Live Preview extension deactivated');
}

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseSize } from '../util';
import { PopoutServer } from '../server';

export class PreviewPanel {
  public static currentPanel: PreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private currentUrl: string = '';
  private popoutServer: PopoutServer;

  private constructor(
    panel: vscode.WebviewPanel,
    private context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this.popoutServer = new PopoutServer();

    // Set webview content
    this._panel.webview.html = this.getWebviewHtml();

    // Listen for panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
            // Webview is ready, load URL if we have one
            if (this.currentUrl) {
              this.loadUrl(this.currentUrl);
            }
            break;
          case 'urlChanged':
            this.currentUrl = message.url;
            this.saveLastUrl(message.url);
            break;
          case 'reload':
            // Just log, actual reload happens in webview
            console.log('Reload requested');
            break;
          case 'rotate':
            console.log('Rotate:', message.isRotated);
            break;
          case 'popout':
            await this.handlePopout(message.url);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(context: vscode.ExtensionContext, url?: string): PreviewPanel {
    const column = vscode.window.activeTextEditor?.viewColumn;

    // If we already have a panel, show it and update URL
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel._panel.reveal(column);
      if (url) {
        PreviewPanel.currentPanel.loadUrl(url);
      }
      return PreviewPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'dualviewPreview',
      'DualView Live Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(context.extensionPath)]
      }
    );

    PreviewPanel.currentPanel = new PreviewPanel(panel, context);
    
    if (url) {
      PreviewPanel.currentPanel.loadUrl(url);
    }

    return PreviewPanel.currentPanel;
  }

  public loadUrl(url: string) {
    this.currentUrl = url;
    this.saveLastUrl(url);
    
    // Send message to webview to load URL
    this._panel.webview.postMessage({
      command: 'loadUrl',
      url: url
    });

    // Update panel title
    this._panel.title = `DualView - ${url}`;
  }

  public reload() {
    this._panel.webview.postMessage({ command: 'reload' });
  }

  private async handlePopout(url: string) {
    const config = vscode.workspace.getConfiguration('dualview');
    const popoutEnabled = config.get<boolean>('popout.enable', true);
    
    if (!popoutEnabled) {
      vscode.window.showWarningMessage('Pop-out feature is disabled in settings');
      return;
    }

    try {
      const preferredPort = config.get<number>('popout.port', 7777);
      const port = await this.popoutServer.start(preferredPort);
      
      const mobileSize = config.get<string>('mobileSize', '430x932');
      const desktopSize = config.get<string>('desktopSize', '1440x900');
      
      const popoutUrl = `http://localhost:${port}?url=${encodeURIComponent(url)}&mobile=${mobileSize}&desktop=${desktopSize}`;
      
      vscode.env.openExternal(vscode.Uri.parse(popoutUrl));
      vscode.window.showInformationMessage(`Opened in browser: http://localhost:${port}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start pop-out server: ${error}`);
    }
  }

  private saveLastUrl(url: string) {
    this.context.workspaceState.update('lastUrl', url);
    this.context.globalState.update('lastUrl', url);
  }

  public dispose() {
    PreviewPanel.currentPanel = undefined;

    this._panel.dispose();
    this.popoutServer.stop();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private getWebviewHtml(): string {
    const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'dualview.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Get viewport sizes from config
    const config = vscode.workspace.getConfiguration('dualview');
    const mobileSize = parseSize(config.get<string>('mobileSize', '430x932'));
    const desktopSize = parseSize(config.get<string>('desktopSize', '1440x900'));

    // Inject sizes into HTML
    html = html.replace(/width:\s*430px/g, `width: ${mobileSize.width}px`);
    html = html.replace(/height:\s*932px/g, `height: ${mobileSize.height}px`);
    html = html.replace(/width:\s*1440px/g, `width: ${desktopSize.width}px`);
    html = html.replace(/height:\s*900px/g, `height: ${desktopSize.height}px`);

    return html;
  }
}


import * as vscode from 'vscode';
import { isPortOpen, extractUrlFromLine, debounce } from './util';

export class ServerDetector {
  private disposables: vscode.Disposable[] = [];
  private probingTimer: NodeJS.Timeout | null = null;
  private detectedUrls = new Set<string>();
  private onUrlDetectedCallback: ((url: string) => void) | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  public onUrlDetected(callback: (url: string) => void) {
    this.onUrlDetectedCallback = callback;
  }

  public startDetection() {
    this.setupTerminalListener();
    this.setupTaskListener();
    this.startPortProbing();
  }

  public stopDetection() {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    if (this.probingTimer) {
      clearInterval(this.probingTimer);
      this.probingTimer = null;
    }
  }

  private setupTerminalListener() {
    // Note: VS Code doesn't expose terminal output directly via API
    // We rely on task listeners and port probing instead
    // This is a limitation of the VS Code extension API
    
    // Monitor terminal creation for potential dev server starts
    const terminalListener = vscode.window.onDidOpenTerminal(() => {
      // Start more aggressive probing when a new terminal opens
      setTimeout(() => this.startAggressiveProbing(), 1000);
    });

    this.disposables.push(terminalListener);
  }

  private setupTaskListener() {
    const taskStartListener = vscode.tasks.onDidStartTaskProcess((event) => {
      const taskName = event.execution.task.name.toLowerCase();
      
      // Check if task is a dev server task
      const devKeywords = ['dev', 'serve', 'start', 'run', 'watch'];
      const isDevTask = devKeywords.some(keyword => taskName.includes(keyword));
      
      if (isDevTask) {
        // Start aggressive probing when a dev task starts
        this.startAggressiveProbing();
      }
    });

    this.disposables.push(taskStartListener);
  }

  private async startPortProbing() {
    const config = vscode.workspace.getConfiguration('dualview');
    const autoProbe = config.get<boolean>('autoOpenOnProbe', true);
    
    if (!autoProbe) {
      return;
    }

    const ports = config.get<number[]>('probe.ports', [5173, 3000, 8080, 4200, 5000, 5500, 8000, 8001]);
    
    // Probe every 2 seconds (slower by default)
    this.probingTimer = setInterval(() => {
      this.probePortsOnce(ports);
    }, 2000);
  }

  private async startAggressiveProbing() {
    const config = vscode.workspace.getConfiguration('dualview');
    const ports = config.get<number[]>('probe.ports', [5173, 3000, 8080, 4200, 5000, 5500, 8000, 8001]);
    
    // Probe every 500ms for 10 seconds after task start
    let count = 0;
    const aggressiveTimer = setInterval(async () => {
      await this.probePortsOnce(ports);
      count++;
      if (count > 20) { // 10 seconds
        clearInterval(aggressiveTimer);
      }
    }, 500);
  }

  private async probePortsOnce(ports: number[]) {
    for (const port of ports) {
      const isOpen = await isPortOpen(port);
      if (isOpen) {
        const url = `http://localhost:${port}`;
        if (!this.detectedUrls.has(url)) {
          this.detectedUrls.add(url);
          this.handleDetectedUrl(url);
        }
      }
    }
  }

  private handleDetectedUrl(url: string) {
    const config = vscode.workspace.getConfiguration('dualview');
    const autoOpen = config.get<boolean>('autoOpenOnUrl', true);

    if (autoOpen && this.onUrlDetectedCallback) {
      this.onUrlDetectedCallback(url);
    }
  }

  public dispose() {
    this.stopDetection();
  }
}


import * as http from 'http';
import * as https from 'https';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import getPort from 'get-port';

export class ProxyServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private targetUrl: string = '';

  async start(targetUrl: string): Promise<string> {
    if (this.server && this.targetUrl === targetUrl) {
      return `http://localhost:${this.port}`;
    }

    // Stop existing server if running
    if (this.server) {
      await this.stop();
    }

    this.targetUrl = targetUrl;
    this.port = await getPort({ port: 8888 });

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.proxyRequest(req, res);
      });

      this.server.listen(this.port, () => {
        const proxyUrl = `http://localhost:${this.port}`;
        console.log(`DualView proxy running on ${proxyUrl} -> ${targetUrl}`);
        resolve(proxyUrl);
      });

      this.server.on('error', reject);
    });
  }

  private proxyRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse) {
    const targetUrl = new URL(this.targetUrl);
    const targetPath = clientReq.url || '/';
    
    // Build proxy request options
    const headers: http.OutgoingHttpHeaders = { ...clientReq.headers };
    delete headers['host'];
    
    const options: http.RequestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetPath,
      method: clientReq.method,
      headers: headers
    };

    const protocol = targetUrl.protocol === 'https:' ? https : http;

    const proxyReq = protocol.request(options, (proxyRes) => {
      // Filter out problematic headers
      const headers: any = {};
      Object.keys(proxyRes.headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        // Strip headers that prevent iframe embedding
        if (
          lowerKey !== 'x-frame-options' &&
          lowerKey !== 'content-security-policy' &&
          lowerKey !== 'content-security-policy-report-only'
        ) {
          headers[key] = proxyRes.headers[key];
        }
      });

      // Set CORS headers to allow embedding
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      headers['Access-Control-Allow-Headers'] = '*';

      clientRes.writeHead(proxyRes.statusCode || 200, headers);
      proxyRes.pipe(clientRes);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err);
      clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      clientRes.end('Bad Gateway: Unable to reach target server');
    });

    // Handle request body
    clientReq.pipe(proxyReq);
  }

  async stop() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.server = null;
          this.port = 0;
          this.targetUrl = '';
          resolve();
        });
      });
    }
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getPort(): number {
    return this.port;
  }
}

export class PopoutServer {
  private server: http.Server | null = null;
  private port: number = 0;

  async start(initialPort: number = 7777): Promise<number> {
    if (this.server) {
      return this.port;
    }

    // Find an available port
    this.port = await getPort({ port: initialPort });

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        console.log(`DualView popout server running on http://localhost:${this.port}`);
        resolve(this.port);
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const targetUrl = url.searchParams.get('url') || 'http://localhost:3000';
      const mobileSize = url.searchParams.get('mobile') || '430x932';
      const desktopSize = url.searchParams.get('desktop') || '1440x900';
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this.generatePopoutHTML(targetUrl, mobileSize, desktopSize));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  private generatePopoutHTML(targetUrl: string, mobileSize: string, desktopSize: string): string {
    const [mobileWidth, mobileHeight] = mobileSize.split('x');
    const [desktopWidth, desktopHeight] = desktopSize.split('x');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DualView - ${targetUrl}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1e1e1e;
      color: #fff;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .toolbar {
      background: #2d2d2d;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #3e3e3e;
      flex-shrink: 0;
    }

    .url-input {
      flex: 1;
      background: #3e3e3e;
      border: 1px solid #555;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
    }

    .btn {
      background: #0e639c;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }

    .btn:hover {
      background: #1177bb;
    }

    .btn-secondary {
      background: #3e3e3e;
    }

    .btn-secondary:hover {
      background: #505050;
    }

    .container {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 20px;
      overflow: auto;
    }

    .panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .panel-label {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .frame-wrapper {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    iframe {
      border: none;
      display: block;
    }

    .mobile-frame {
      width: ${mobileWidth}px;
      height: ${mobileHeight}px;
    }

    .desktop-frame {
      width: ${desktopWidth}px;
      height: ${desktopHeight}px;
    }

    @media (max-width: 1600px) {
      .container {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <input type="text" class="url-input" id="urlInput" value="${targetUrl}" placeholder="Enter URL...">
    <button class="btn" onclick="reloadFrames()">🔄 Reload</button>
    <button class="btn btn-secondary" onclick="rotateDevice()">📱 Rotate</button>
  </div>

  <div class="container">
    <div class="panel">
      <div class="panel-label">📱 Mobile - iPhone 14 Pro Max</div>
      <div class="frame-wrapper">
        <iframe id="mobileFrame" class="mobile-frame" src="${targetUrl}"></iframe>
      </div>
    </div>

    <div class="panel">
      <div class="panel-label">💻 Desktop - MacBook 13"</div>
      <div class="frame-wrapper">
        <iframe id="desktopFrame" class="desktop-frame" src="${targetUrl}"></iframe>
      </div>
    </div>
  </div>

  <script>
    const urlInput = document.getElementById('urlInput');
    const mobileFrame = document.getElementById('mobileFrame');
    const desktopFrame = document.getElementById('desktopFrame');
    let isRotated = false;

    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const newUrl = urlInput.value;
        mobileFrame.src = newUrl;
        desktopFrame.src = newUrl;
        updateUrlParam(newUrl);
      }
    });

    function reloadFrames() {
      mobileFrame.contentWindow.location.reload();
      desktopFrame.contentWindow.location.reload();
    }

    function rotateDevice() {
      const mobile = document.querySelector('.mobile-frame');
      if (!isRotated) {
        mobile.style.width = '${mobileHeight}px';
        mobile.style.height = '${mobileWidth}px';
      } else {
        mobile.style.width = '${mobileWidth}px';
        mobile.style.height = '${mobileHeight}px';
      }
      isRotated = !isRotated;
    }

    function updateUrlParam(url) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('url', url);
      window.history.pushState({}, '', newUrl);
    }

    // Auto-reload on changes (for development)
    let lastModified = Date.now();
    setInterval(() => {
      // Optional: implement hot reload detection
    }, 1000);
  </script>
</body>
</html>`;
  }

  async stop() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.server = null;
          this.port = 0;
          resolve();
        });
      });
    }
  }

  getPort(): number {
    return this.port;
  }

  isRunning(): boolean {
    return this.server !== null;
  }
}

export class StaticServer {
  private server: http.Server | null = null;
  private port: number = 0;

  async serve(folderPath: string): Promise<string> {
    this.port = await getPort({ port: 5500 });

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let filePath = path.join(folderPath, req.url === '/' ? 'index.html' : req.url!);
        
        // Security: prevent directory traversal
        if (!filePath.startsWith(folderPath)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            // Try adding .html extension
            if (!filePath.endsWith('.html')) {
              filePath += '.html';
              fs.readFile(filePath, (err2, data2) => {
                if (err2) {
                  res.writeHead(404);
                  res.end('Not Found');
                } else {
                  this.sendFile(res, filePath, data2);
                }
              });
            } else {
              res.writeHead(404);
              res.end('Not Found');
            }
          } else {
            this.sendFile(res, filePath, data);
          }
        });
      });

      this.server.listen(this.port, () => {
        const url = `http://localhost:${this.port}`;
        console.log(`Static server running on ${url}`);
        resolve(url);
      });

      this.server.on('error', reject);
    });
  }

  private sendFile(res: http.ServerResponse, filePath: string, data: Buffer) {
    const ext = path.extname(filePath);
    const contentTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  }

  async stop() {
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.server = null;
          this.port = 0;
          resolve();
        });
      });
    }
  }
}


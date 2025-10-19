import * as http from 'http';

export interface ViewportSize {
  width: number;
  height: number;
}

export function parseSize(sizeStr: string): ViewportSize {
  const parts = sizeStr.split('x');
  return {
    width: parseInt(parts[0]) || 430,
    height: parseInt(parts[1]) || 932
  };
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function isPortOpen(port: number, host: string = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}`, () => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export function extractUrlFromLine(line: string): string | null {
  const urlRegex = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s]*)?/gi;
  const matches = line.match(urlRegex);
  return matches ? matches[0] : null;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}


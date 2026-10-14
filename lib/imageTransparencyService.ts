import { useState, useEffect } from 'react';
import { PNG } from 'pngjs/browser.js';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

// Global In-Memory Cache for processed transparent PNGs
const transparentCache = new Map<string, string>();

/**
 * Pure JavaScript base64 to Buffer converter
 */
function base64ToBuffer(base64: string): Buffer {
  const clean = base64.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

/**
 * Pure JavaScript Buffer to base64 string converter
 */
function bufferToBase64(bytes: Uint8Array | Buffer): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * Pure JavaScript on-device background transparency converter
 * Removes connected white/near-white background pixels using 4-border BFS flood fill.
 * Works 100% natively on iOS, Android, and Web without any DOM or Canvas dependency!
 *
 * @param {string} imageSource - base64 Data URI or remote URL
 * @param {number} threshold - white brightness cutoff (default: 228)
 * @returns {Promise<string>} - transparent PNG Data URI (`data:image/png;base64,...`)
 */
export async function makeBackgroundTransparentOnDevice(imageSource: string, threshold: number = 228): Promise<string> {
  if (!imageSource || typeof imageSource !== 'string') return imageSource;

  // Already transparent SVG
  if (imageSource.startsWith('data:image/svg+xml')) return imageSource;

  if (transparentCache.has(imageSource)) {
    return transparentCache.get(imageSource)!;
  }

  try {
    let rawBytes = null;

    if (imageSource.startsWith('data:image')) {
      rawBytes = base64ToBuffer(imageSource);
    } else if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      const resp = await fetch(imageSource);
      if (!resp.ok) return imageSource;
      const arrayBuffer = await resp.arrayBuffer();
      rawBytes = Buffer.from(arrayBuffer);
    } else {
      return imageSource;
    }

    if (!rawBytes || rawBytes.length < 8) return imageSource;

    let width = 0;
    let height = 0;
    let rgbaData = null;

    // Detect format by magic header bytes
    if (rawBytes[0] === 0xFF && rawBytes[1] === 0xD8) {
      // JPEG
      const decoded = jpeg.decode(rawBytes, { useTArray: true });
      width = decoded.width;
      height = decoded.height;
      rgbaData = decoded.data;
    } else if (rawBytes[0] === 0x89 && rawBytes[1] === 0x50 && rawBytes[2] === 0x4E && rawBytes[3] === 0x47) {
      // PNG
      const decoded = PNG.sync.read(Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes));
      width = decoded.width;
      height = decoded.height;
      rgbaData = decoded.data;
    } else {
      // Unsupported or raw format
      return imageSource;
    }

    if (!width || !height || !rgbaData) return imageSource;

    // Ultra-fast zero-allocation BFS Flood Fill from all 4 borders
    const totalPixels = width * height;
    const visited = new Uint8Array(totalPixels);
    const queueX = new Int32Array(totalPixels);
    const queueY = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const isWhitePixel = (idx: number): boolean => {
      // If already transparent, treat as transparent background so BFS traverses through
      if (rgbaData[idx + 3] < 50) return true;
      const r = rgbaData[idx];
      const g = rgbaData[idx + 1];
      const b = rgbaData[idx + 2];
      // Pure or near-white background (threshold default: 228)
      if (r >= threshold && g >= threshold && b >= threshold) return true;
      // Checkerboard fake transparency tiles (r, g, b almost identical and bright)
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      if (minVal >= 175 && (maxVal - minVal) <= 18) return true;
      return false;
    };

    const tryAddSeed = (x: number, y: number): void => {
      const pIdx = y * width + x;
      if (visited[pIdx]) return;
      visited[pIdx] = 1;
      const dIdx = pIdx * 4;
      if (isWhitePixel(dIdx)) {
        rgbaData[dIdx + 3] = 0; // Transparent
        queueX[tail] = x;
        queueY[tail] = y;
        tail++;
      }
    };

    // Seed outer border pixels
    for (let x = 0; x < width; x++) {
      tryAddSeed(x, 0);
      tryAddSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      tryAddSeed(0, y);
      tryAddSeed(width - 1, y);
    }

    while (head < tail) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      // Check 4 neighbors
      if (cx > 0) {
        const pIdx = cy * width + (cx - 1);
        if (!visited[pIdx]) {
          visited[pIdx] = 1;
          const dIdx = pIdx * 4;
          if (isWhitePixel(dIdx)) {
            rgbaData[dIdx + 3] = 0;
            queueX[tail] = cx - 1;
            queueY[tail] = cy;
            tail++;
          }
        }
      }
      if (cx < width - 1) {
        const pIdx = cy * width + (cx + 1);
        if (!visited[pIdx]) {
          visited[pIdx] = 1;
          const dIdx = pIdx * 4;
          if (isWhitePixel(dIdx)) {
            rgbaData[dIdx + 3] = 0;
            queueX[tail] = cx + 1;
            queueY[tail] = cy;
            tail++;
          }
        }
      }
      if (cy > 0) {
        const pIdx = (cy - 1) * width + cx;
        if (!visited[pIdx]) {
          visited[pIdx] = 1;
          const dIdx = pIdx * 4;
          if (isWhitePixel(dIdx)) {
            rgbaData[dIdx + 3] = 0;
            queueX[tail] = cx;
            queueY[tail] = cy - 1;
            tail++;
          }
        }
      }
      if (cy < height - 1) {
        const pIdx = (cy + 1) * width + cx;
        if (!visited[pIdx]) {
          visited[pIdx] = 1;
          const dIdx = pIdx * 4;
          if (isWhitePixel(dIdx)) {
            rgbaData[dIdx + 3] = 0;
            queueX[tail] = cx;
            queueY[tail] = cy + 1;
            tail++;
          }
        }
      }
    }

    // Pack into clean transparent PNG
    const outPng = new PNG({ width, height });
    outPng.data = Buffer.isBuffer(rgbaData) ? rgbaData : Buffer.from(rgbaData);
    const pngBytes = PNG.sync.write(outPng);

    const base64Png = bufferToBase64(pngBytes);
    const finalDataUri = `data:image/png;base64,${base64Png}`;

    transparentCache.set(imageSource, finalDataUri);
    return finalDataUri;
  } catch (err) {
    console.warn('[ImageTransparency] On-device conversion error:', err);
    return imageSource;
  }
}

/**
 * React Hook for rendering a transparent version of any image URI
 */
export function useTransparentImage(imageUri?: string | null): string | null | undefined {
  const [cleanUri, setCleanUri] = useState<string | null | undefined>(imageUri);

  useEffect(() => {
    if (!imageUri) {
      setCleanUri(null);
      return;
    }
    if (imageUri.startsWith('data:image/svg+xml')) {
      setCleanUri(imageUri);
      return;
    }

    let isMounted = true;
    makeBackgroundTransparentOnDevice(imageUri).then((res) => {
      if (isMounted && res) {
        setCleanUri(res);
      }
    }).catch(() => {
      if (isMounted) setCleanUri(imageUri);
    });

    return () => {
      isMounted = false;
    };
  }, [imageUri]);

  return cleanUri || imageUri;
}

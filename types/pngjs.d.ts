declare module 'pngjs/browser.js' {
  export class PNG {
    constructor(options?: { width?: number; height?: number });
    width: number;
    height: number;
    data: Uint8Array | Buffer | number[];
    static sync: {
      read(buffer: Uint8Array | ArrayBuffer | Buffer): PNG;
      write(png: PNG): Buffer;
    };
    parse(data: Uint8Array | Buffer, callback: (err: Error | null, data: PNG) => void): void;
    pack(): { pipe(dest: any): any };
  }
}

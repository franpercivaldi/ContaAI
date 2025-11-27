declare module 'pdf-parse' {
  import type { Buffer } from 'buffer';

  interface PdfMetadata {
    info?: any;
    metadata?: any;
    text: string;
    version?: string;
  }

  function pdfParse(data: Buffer | Uint8Array): Promise<PdfMetadata>;

  export default pdfParse;
}

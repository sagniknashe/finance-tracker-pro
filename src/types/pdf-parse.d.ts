/**
 * Minimal typings for pdf-parse. We import the inner module path
 * ("pdf-parse/lib/pdf-parse.js") to avoid the package's index.js, which runs
 * debug/test code when `module.parent` is undefined (as under bundlers).
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}

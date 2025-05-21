// Module declarations for PDF.js
declare module 'pdfjs-dist/build/pdf' {
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const worker: any;
  export default worker;
}

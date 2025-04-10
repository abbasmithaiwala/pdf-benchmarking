/**
 * Service to handle PDF generation using Web Workers
 */

interface PdfGenerationMetrics {
  dataGenerationTime: number;
  totalTime: number;
  workerStartTime?: number;
  workerEndTime?: number;
  totalProcessTime?: number;
}

interface PdfGenerationResult {
  pdfData: string;
  metrics: PdfGenerationMetrics;
}

/**
 * Generate a PDF with the specified number of rows
 * @param rowCount Number of data rows to include in the PDF
 * @returns Promise that resolves to an object containing the PDF data and performance metrics
 */
export function generatePdf(rowCount: number): Promise<PdfGenerationResult> {
  const workerStartTime = performance.now();
  
  return new Promise((resolve, reject) => {
    // Create a new worker
    const worker = new Worker(
      new URL('../workers/pdfMakeWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from the worker
    worker.onmessage = (event) => {
      const workerEndTime = performance.now();
      const { success, data, error, metrics } = event.data;
      
      // Terminate the worker when done
      worker.terminate();
      
      if (success) {
        const totalProcessTime = workerEndTime - workerStartTime;
        
        resolve({
          pdfData: data,
          metrics: {
            ...metrics,
            workerStartTime,
            workerEndTime,
            totalProcessTime
          }
        });
      } else {
        reject(new Error(error || 'PDF generation failed'));
      }
    };

    // Handle worker errors
    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Send the row count to the worker
    worker.postMessage({ rowCount });
  });
}

/**
 * Open the generated PDF in a new tab
 * @param base64Data PDF data as base64 string
 */
export function openPdfInNewTab(base64Data: string): void {
  const pdfUrl = `data:application/pdf;base64,${base64Data}`;
  
  // Create a blob from the base64 data for better browser compatibility
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  
  // Create a URL for the blob
  const blobUrl = URL.createObjectURL(blob);
  
  // Open in a new tab and ensure content is displayed correctly
  const newWindow = window.open();
  if (newWindow) {
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PDF Viewer</title>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              overflow: hidden;
            }
            #pdf-container {
              width: 100%;
              height: 100vh;
              display: block;
            }
          </style>
        </head>
        <body>
          <embed id="pdf-container" src="${blobUrl}" type="application/pdf" />
        </body>
      </html>
    `);
    newWindow.document.close();
    
    // Clean up the blob URL when the window is closed
    newWindow.onbeforeunload = () => {
      URL.revokeObjectURL(blobUrl);
    };
  } else {
    // Fallback in case window.open() is blocked
    const newTab = window.open(blobUrl, '_blank');
    if (!newTab) {
      alert('Please allow popups for this website to view the PDF.');
    }
  }
}

/**
 * Download the generated PDF
 * @param base64Data PDF data as base64 string
 * @param filename Optional filename (default: generated-pdf.pdf)
 */
export function downloadPdf(base64Data: string, filename = 'generated-pdf.pdf'): void {
  const linkSource = `data:application/pdf;base64,${base64Data}`;
  const downloadLink = document.createElement('a');
  
  downloadLink.href = linkSource;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink); // Required for Firefox
  downloadLink.click();
  document.body.removeChild(downloadLink); // Clean up
}

/**
 * Format a time duration in milliseconds to a human-readable string
 * @param ms Time in milliseconds
 * @returns Formatted time string
 */
export function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
} 
/**
 * Service to handle PDF generation using Typst and Web Workers
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
 * Generate a PDF with the specified number of rows using Typst
 * @param rowCount Number of data rows to include in the PDF
 * @returns Promise that resolves to an object containing the PDF data and performance metrics
 */
export function generatePdfWithTypst(rowCount: number): Promise<PdfGenerationResult> {
  const workerStartTime = performance.now();
  
  console.log(`[Typst Service] Starting PDF generation with ${rowCount} rows`);
  
  return new Promise((resolve, reject) => {
    try {
      // Create a new worker
      const worker = new Worker(
        new URL('../workers/typstWorker.ts', import.meta.url),
        { type: 'module' }
      );

      console.log('[Typst Service] Worker created, sending message');
      
      // Handle messages from the worker
      worker.onmessage = (event) => {
        const workerEndTime = performance.now();
        const { success, data, error, metrics } = event.data;
        
        console.log(`[Typst Service] Received message from worker: success=${success}`);
        
        // Terminate the worker when done
        worker.terminate();
        
        if (success) {
          const totalProcessTime = workerEndTime - workerStartTime;
          
          console.log('[Typst Service] PDF generation successful');
          
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
          console.error('[Typst Service] Worker reported error:', error);
          reject(new Error(error || 'PDF generation failed'));
        }
      };

      // Handle worker errors
      worker.onerror = (error) => {
        console.error('[Typst Service] Worker error:', error);
        worker.terminate();
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Send the row count to the worker
      worker.postMessage({ rowCount });
    } catch (err) {
      console.error('[Typst Service] Error creating or communicating with worker:', err);
      reject(err);
    }
  });
}

// Reuse these utility functions from pdfMakeService.ts
export { openPdfInNewTab, downloadPdf, formatTime } from './pdfMakeService'; 
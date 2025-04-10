/**
 * Service to handle PDF generation using PDFme and Web Workers
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
 * Generate a PDF with the specified number of rows using PDFme
 * @param rowCount Number of data rows to include in the PDF
 * @returns Promise that resolves to an object containing the PDF data and performance metrics
 */
export function generatePdfWithPdfMe(rowCount: number): Promise<PdfGenerationResult> {
  const workerStartTime = performance.now();
  
  return new Promise((resolve, reject) => {
    // Create a new worker
    const worker = new Worker(
      new URL('../workers/pdfMeWorker.ts', import.meta.url),
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
        reject(new Error(error || 'PDF generation with PDFme failed'));
      }
    };

    // Handle worker errors
    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(`PDFme worker error: ${error.message}`));
    };

    // Send the row count to the worker
    worker.postMessage({ rowCount });
  });
} 
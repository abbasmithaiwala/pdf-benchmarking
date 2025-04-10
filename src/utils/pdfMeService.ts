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

// Worker pool for reusing workers
const workerPool: Worker[] = [];
const MAX_POOL_SIZE = 2; // Adjust based on performance testing

// Cache for PDF results to avoid regenerating the same reports
const pdfCache = new Map<number, PdfGenerationResult>();

/**
 * Get a worker from the pool or create a new one
 */
function getWorker(): Worker {
  if (workerPool.length > 0) {
    return workerPool.pop()!;
  }
  
  return new Worker(
    new URL('../workers/pdfMeWorker.ts', import.meta.url),
    { type: 'module' }
  );
}

/**
 * Return a worker to the pool
 */
function releaseWorker(worker: Worker): void {
  if (workerPool.length < MAX_POOL_SIZE) {
    workerPool.push(worker);
  } else {
    worker.terminate();
  }
}

/**
 * Generate a PDF with the specified number of rows using PDFme
 * @param rowCount Number of data rows to include in the PDF
 * @returns Promise that resolves to an object containing the PDF data and performance metrics
 */
export function generatePdfWithPdfMe(rowCount: number): Promise<PdfGenerationResult> {
  // Check if result is in cache
  if (pdfCache.has(rowCount)) {
    return Promise.resolve(pdfCache.get(rowCount)!);
  }
  
  const workerStartTime = performance.now();
  
  return new Promise((resolve, reject) => {
    // Get a worker from the pool
    const worker = getWorker();

    // Handle messages from the worker
    worker.onmessage = (event) => {
      const workerEndTime = performance.now();
      const { success, data, error, metrics } = event.data;
      
      // Release the worker instead of terminating
      releaseWorker(worker);
      
      if (success) {
        const totalProcessTime = workerEndTime - workerStartTime;
        
        const result = {
          pdfData: data,
          metrics: {
            ...metrics,
            workerStartTime,
            workerEndTime,
            totalProcessTime
          }
        };
        
        // Store result in cache
        pdfCache.set(rowCount, result);
        
        resolve(result);
      } else {
        reject(new Error(error || 'PDF generation with PDFme failed'));
      }
    };

    // Handle worker errors
    worker.onerror = (error) => {
      releaseWorker(worker);
      reject(new Error(`PDFme worker error: ${error.message}`));
    };

    // Send the row count to the worker
    worker.postMessage({ rowCount });
  });
} 

/**
 * Clear the PDF cache
 */
export function clearPdfCache(): void {
  pdfCache.clear();
}

/**
 * Cleanup worker pool - call this when the component unmounts
 */
export function cleanupWorkerPool(): void {
  workerPool.forEach(worker => worker.terminate());
  workerPool.length = 0;
} 
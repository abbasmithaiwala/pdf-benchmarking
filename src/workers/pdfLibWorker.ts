// Import pdf-lib
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Define the structure for a single row of data
interface RowData {
  name: string;
  age: number;
  email: string;
  occupation: string;
}

// Pre-define occupations to avoid string concatenation in the loop
const OCCUPATIONS = ['Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'];

// Function to generate dummy data based on number of rows
function generateDummyData(rowCount: number): RowData[] {
  // Pre-allocate array for better performance
  const dummyData = new Array(rowCount);
  
  for (let i = 0; i < rowCount; i++) {
    dummyData[i] = {
      name: `Person ${i + 1}`,
      age: 20 + (i % 40), // Ages between 20 and 59
      email: `person${i + 1}@example.com`,
      occupation: OCCUPATIONS[i % 5]
    };
  }
  
  return dummyData;
}

// Function to create PDF document
async function createPdf(rowCount: number) {
  // Start performance measurement
  const startTime = performance.now();
  
  // Generate data
  const data = generateDummyData(rowCount);
  
  // Calculate data generation time
  const dataGenerationTime = performance.now() - startTime;
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed the standard font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Add a page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  
  // Set some properties for our table
  const margin = 50;
  const headerHeight = 30;
  const rowHeight = 25;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  
  // Column widths
  const colWidths = [
    (pageWidth - margin * 2) * 0.25, // Name column
    (pageWidth - margin * 2) * 0.1,  // Age column
    (pageWidth - margin * 2) * 0.4,  // Email column
    (pageWidth - margin * 2) * 0.25  // Occupation column
  ];
  
  // Draw title
  page.drawText('Sample PDF Report', {
    x: margin,
    y: pageHeight - margin,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0)
  });
  
  // Draw subtitle
  page.drawText(`Generated with ${rowCount} rows of data`, {
    x: margin,
    y: pageHeight - margin - 25,
    size: 14,
    font: font,
    color: rgb(0, 0, 0)
  });
  
  // Draw description
  page.drawText('This PDF was generated on the client-side using Web Workers and pdf-lib', {
    x: margin,
    y: pageHeight - margin - 50,
    size: 10,
    font: font,
    color: rgb(0, 0, 0)
  });
  
  // Draw table header
  const tableTop = pageHeight - margin - 80;
  let currentY = tableTop;
  
  // Draw header background
  page.drawRectangle({
    x: margin,
    y: currentY - headerHeight,
    width: pageWidth - margin * 2,
    height: headerHeight,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  // Draw header text
  const headerLabels = ['Name', 'Age', 'Email', 'Occupation'];
  let currentX = margin;
  
  for (let i = 0; i < headerLabels.length; i++) {
    page.drawText(headerLabels[i], {
      x: currentX + 5,
      y: currentY - 20,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    currentX += colWidths[i];
  }
  
  currentY -= headerHeight;
  
  // Calculate how many rows we can fit on the first page
  let maxRowsOnFirstPage = Math.floor((currentY - margin) / rowHeight);
  
  // Determine how many rows we can fit per page for subsequent pages
  const rowsPerPage = Math.floor((pageHeight - margin * 2 - headerHeight) / rowHeight);
  
  // Process data rows
  let rowIndex = 0;
  let pageIndex = 0;
  
  while (rowIndex < data.length) {
    // If we need a new page
    if ((pageIndex === 0 && rowIndex >= maxRowsOnFirstPage) || 
        (pageIndex > 0 && rowIndex >= maxRowsOnFirstPage + pageIndex * rowsPerPage)) {
      // Add a new page
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      pageIndex++;
      currentY = pageHeight - margin;
      
      // Draw header on new page
      newPage.drawRectangle({
        x: margin,
        y: currentY - headerHeight,
        width: pageWidth - margin * 2,
        height: headerHeight,
        color: rgb(0.9, 0.9, 0.9)
      });
      
      // Draw header text on new page
      currentX = margin;
      for (let i = 0; i < headerLabels.length; i++) {
        newPage.drawText(headerLabels[i], {
          x: currentX + 5,
          y: currentY - 20,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0)
        });
        currentX += colWidths[i];
      }
      
      currentY -= headerHeight;
    }
    
    // Draw row
    const row = data[rowIndex];
    currentX = margin;
    
    // Get the current page
    const currentPage = pdfDoc.getPages()[pageIndex];
    
    // Draw alternating row background
    if (rowIndex % 2 === 1) {
      currentPage.drawRectangle({
        x: margin,
        y: currentY - rowHeight,
        width: pageWidth - margin * 2,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95)
      });
    }
    
    // Draw row data
    currentPage.drawText(row.name, {
      x: currentX + 5,
      y: currentY - 15,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
    currentX += colWidths[0];
    
    currentPage.drawText(row.age.toString(), {
      x: currentX + 5,
      y: currentY - 15,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
    currentX += colWidths[1];
    
    currentPage.drawText(row.email, {
      x: currentX + 5,
      y: currentY - 15,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
    currentX += colWidths[2];
    
    currentPage.drawText(row.occupation, {
      x: currentX + 5,
      y: currentY - 15,
      size: 10,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    currentY -= rowHeight;
    rowIndex++;
  }
  
  // Serialize the PDFDocument to bytes
  const pdfBytes = await pdfDoc.save();
  
  // Convert to base64
  const pdfBase64 = arrayBufferToBase64(pdfBytes);
  
  // Calculate total time
  const totalTime = performance.now() - startTime;
  
  return {
    pdfData: pdfBase64,
    metrics: {
      dataGenerationTime,
      totalTime
    }
  };
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { rowCount } = event.data;
  
  try {
    
    // Create PDF
    const result = await createPdf(rowCount);
    
    // Send the base64 data back to the main thread with timing metrics
    self.postMessage({ 
      success: true, 
      data: result.pdfData,
      metrics: {
        dataGenerationTime: result.metrics.dataGenerationTime,
        totalTime: result.metrics.totalTime
      }
    });
  } catch (error) {
    // Send error back to main thread
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export empty object to satisfy TypeScript module requirements
export {}; 
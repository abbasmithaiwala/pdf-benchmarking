// Import pdfmake and its interfaces
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configure pdfMake with the default fonts
pdfMake.vfs = pdfFonts.vfs;

// Define the structure for a single row of data
interface RowData {
  name: string;
  age: number;
  email: string;
  occupation: string;
}

// Pre-define occupations to avoid string concatenation in the loop
const OCCUPATIONS = ['Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'];

// Function to generate dummy data based on number of rows - optimized version
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

// Function to create PDF document definition - optimized
function createPdfDefinition(rowCount: number) {
  // Start performance measurement
  const startTime = performance.now();
  
  const data = generateDummyData(rowCount);
  
  // Create table header row once
  const headerRow = [
    { text: 'Name', bold: true, fillColor: '#eeeeee' },
    { text: 'Age', bold: true, fillColor: '#eeeeee' },
    { text: 'Email', bold: true, fillColor: '#eeeeee' },
    { text: 'Occupation', bold: true, fillColor: '#eeeeee' }
  ];
  
  // Pre-allocate the table body array with exact size for better performance
  const tableBody: any[][] = new Array(data.length + 1);
  tableBody[0] = headerRow;
  
  // Add data rows efficiently
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    tableBody[i + 1] = [
      { text: row.name },
      { text: row.age.toString() },
      { text: row.email },
      { text: row.occupation }
    ];
  }
  
  // Document definition
  const docDefinition: any = {
    content: [
      { text: 'Sample PDF Report', style: 'header' },
      { text: `Generated with ${rowCount} rows of data`, style: 'subheader' },
      { text: 'This PDF was generated on the client-side using Web Workers and pdfMake', margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', '*', '*'],
          body: tableBody
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      }
    }
  };
  
  // Calculate generation time
  const dataGenerationTime = performance.now() - startTime;
  
  return { docDefinition, dataGenerationTime };
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { rowCount } = event.data;
  
  try {
    // Track total time
    const totalStartTime = performance.now();
    
    // Create PDF definition
    const { docDefinition, dataGenerationTime } = createPdfDefinition(rowCount);
    
    // Generate PDF
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    // Get PDF as base64
    pdfDocGenerator.getBase64((base64Data) => {
      // Calculate total time
      const totalTime = performance.now() - totalStartTime;
      
      // Send the base64 data back to the main thread with timing metrics
      self.postMessage({ 
        success: true, 
        data: base64Data,
        metrics: {
          dataGenerationTime,
          totalTime
        }
      });
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
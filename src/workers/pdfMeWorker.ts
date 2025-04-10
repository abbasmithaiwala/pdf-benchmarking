// Import pdfme modules (TypeScript compatible)
import { generate } from '@pdfme/generator';
import { Template } from '@pdfme/common';

// Define the structure for a single row of data
interface RowData {
  name: string;
  age: number;
  email: string;
  occupation: string;
}

// Pre-define occupations
const OCCUPATIONS = ['Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'];

// Function to generate dummy data
function generateDummyData(rowCount: number): RowData[] {
  const dummyData = new Array<RowData>(rowCount);
  
  for (let i = 0; i < rowCount; i++) {
    dummyData[i] = {
      name: `Person ${i + 1}`,
      age: 20 + (i % 40),
      email: `person${i + 1}@example.com`,
      occupation: OCCUPATIONS[i % OCCUPATIONS.length]
    };
  }
  
  return dummyData;
}

// Function to create PDF
async function createPdf(rowCount: number): Promise<{ pdfData: string; metrics: { dataGenerationTime: number; totalTime: number } }> {
  const startTime = performance.now();
  const data = generateDummyData(rowCount);
  const dataGenerationTime = performance.now() - startTime;

  // Define fields based on the PDFme schema requirements
  const schema = [
    {
      name: 'header',
      type: 'text',
      position: { x: 30, y: 30 },
      width: 535,
      height: 20,
      fontSize: 18,
      fontColor: '#000000',
      alignment: 'center',
    },
    {
      name: 'nameHeader',
      type: 'text',
      position: { x: 30, y: 100 },
      width: 130,
      height: 15,
      fontSize: 12,
      fontColor: '#ffffff',
      backgroundColor: '#4472C4',
      alignment: 'center',
    },
    {
      name: 'ageHeader',
      type: 'text',
      position: { x: 160, y: 100 },
      width: 60,
      height: 15,
      fontSize: 12,
      fontColor: '#ffffff',
      backgroundColor: '#4472C4',
      alignment: 'center',
    },
    {
      name: 'emailHeader',
      type: 'text',
      position: { x: 220, y: 100 },
      width: 180,
      height: 15,
      fontSize: 12,
      fontColor: '#ffffff',
      backgroundColor: '#4472C4',
      alignment: 'center',
    },
    {
      name: 'occupationHeader',
      type: 'text',
      position: { x: 400, y: 100 },
      width: 150,
      height: 15, 
      fontSize: 12,
      fontColor: '#ffffff',
      backgroundColor: '#4472C4',
      alignment: 'center',
    }
  ];

  // Create template
  const template: Template = {
    basePdf: { width: 595, height: 842, padding: [30, 30, 30, 30] }, // A4 size in points
    schemas: [schema]
  };

  const rowHeight = 20;
  const startY = 120;
  const maxRowsPerPage = 30;
  const totalPages = Math.ceil(data.length / maxRowsPerPage);

  // Prepare inputs array
  const inputs = Array(totalPages).fill(null).map((_, pageIndex) => {
    const pageInput: Record<string, string> = {};
    
    // Add headers to first page only
    if (pageIndex === 0) {
      pageInput.header = `Sample PDF Report - ${rowCount} Rows`;
      pageInput.nameHeader = 'Name';
      pageInput.ageHeader = 'Age';
      pageInput.emailHeader = 'Email';
      pageInput.occupationHeader = 'Occupation';
    }
    
    return pageInput;
  });

  // Add row data fields
  let currentPage = 0;
  let rowsOnCurrentPage = 0;

  data.forEach((rowData, i) => {
    if (rowsOnCurrentPage >= maxRowsPerPage) {
      currentPage++;
      rowsOnCurrentPage = 0;
      template.schemas.push([...schema]); // Add schema for new page
    }

    const yPosition = startY + (rowsOnCurrentPage * rowHeight);
    const backgroundColor = i % 2 === 0 ? '#FFFFFF' : '#E6F0FF';

    // Create field schema for this row
    const rowFields = [
      {
        name: `name_${i}`,
        type: 'text',
        position: { x: 30, y: yPosition },
        width: 130,
        height: rowHeight,
        fontSize: 10,
        fontColor: '#000000',
        backgroundColor,
        alignment: 'left'
      },
      {
        name: `age_${i}`,
        type: 'text',
        position: { x: 160, y: yPosition },
        width: 60,
        height: rowHeight,
        fontSize: 10,
        fontColor: '#000000',
        backgroundColor,
        alignment: 'center'
      },
      {
        name: `email_${i}`,
        type: 'text',
        position: { x: 220, y: yPosition },
        width: 180,
        height: rowHeight,
        fontSize: 10,
        fontColor: '#000000',
        backgroundColor,
        alignment: 'left'
      },
      {
        name: `occupation_${i}`,
        type: 'text',
        position: { x: 400, y: yPosition },
        width: 150,
        height: rowHeight,
        fontSize: 10,
        fontColor: '#000000',
        backgroundColor,
        alignment: 'left'
      }
    ];

    // Add fields to current page schema
    template.schemas[currentPage].push(...rowFields);
    
    // Add data to inputs
    inputs[currentPage][`name_${i}`] = rowData.name;
    inputs[currentPage][`age_${i}`] = rowData.age.toString();
    inputs[currentPage][`email_${i}`] = rowData.email;
    inputs[currentPage][`occupation_${i}`] = rowData.occupation;

    rowsOnCurrentPage++;
  });

  // Generate PDF
  const pdf = await generate({
    template,
    inputs,
    options: {
      title: "Sample PDF Report",
      author: "PDFme Generator"
    }
  });

  const base64String = arrayBufferToBase64(pdf);
  const totalTime = performance.now() - startTime;

  return {
    pdfData: base64String,
    metrics: { dataGenerationTime, totalTime }
  };
}

// ArrayBuffer to base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
}

// Web Worker message handler
self.addEventListener('message', async (event: MessageEvent<{ rowCount: number }>) => {
  const { rowCount } = event.data;

  try {
    const result = await createPdf(rowCount);
    self.postMessage({
      success: true,
      data: result.pdfData,
      metrics: result.metrics
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// TypeScript module requirement
export {};
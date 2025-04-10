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

// Cache for generated data to avoid regenerating the same data multiple times
const dataCache = new Map<number, RowData[]>();

// Cache for templates to avoid recreating the same structure
const templateCache = new Map<number, { template: Template; maxRows: number }>();

// Function to generate dummy data - optimized with caching
function generateDummyData(rowCount: number): RowData[] {
  // Check if data is already in cache
  if (dataCache.has(rowCount)) {
    return dataCache.get(rowCount)!;
  }
  
  // Create data in batch for better performance
  const dummyData = new Array<RowData>(rowCount);
  const namePrefix = 'Person ';
  const emailSuffix = '@example.com';
  
  for (let i = 0; i < rowCount; i++) {
    dummyData[i] = {
      name: namePrefix + (i + 1),
      age: 20 + (i % 40),
      email: `person${i + 1}${emailSuffix}`,
      occupation: OCCUPATIONS[i % OCCUPATIONS.length]
    };
  }
  
  // Store in cache for future use
  dataCache.set(rowCount, dummyData);
  return dummyData;
}

// Create a base schema once and reuse it
const createBaseSchema = () => [
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

// Create a template with efficient schema generation
function createTemplate(rowCount: number, maxRowsPerPage: number): { template: Template; inputs: Record<string, string>[]; } {
  // Check if template is already in cache
  const cacheKey = `${rowCount}_${maxRowsPerPage}`;
  const cachedTemplate = templateCache.get(rowCount);
  
  if (cachedTemplate && cachedTemplate.maxRows === maxRowsPerPage) {
    // If we have a cached template, we only need to generate the inputs
    const data = generateDummyData(rowCount);
    return {
      template: cachedTemplate.template,
      inputs: generateInputs(data, cachedTemplate.template, rowCount, maxRowsPerPage)
    };
  }
  
  const data = generateDummyData(rowCount);
  const baseSchema = createBaseSchema();
  const rowHeight = 20;
  const startY = 120;
  const totalPages = Math.ceil(rowCount / maxRowsPerPage);
  
  // Initialize template with first page schema
  const template: Template = {
    basePdf: { width: 595, height: 842, padding: [30, 30, 30, 30] }, // A4 size in points
    schemas: [baseSchema]
  };
  
  // Pre-allocate schemas for all pages
  for (let i = 1; i < totalPages; i++) {
    template.schemas.push([...baseSchema]);
  }
  
  // Batch create all row fields
  let currentPage = 0;
  let rowsOnCurrentPage = 0;
  
  for (let i = 0; i < rowCount; i++) {
    if (rowsOnCurrentPage >= maxRowsPerPage) {
      currentPage++;
      rowsOnCurrentPage = 0;
    }
    
    const yPosition = startY + (rowsOnCurrentPage * rowHeight);
    const backgroundColor = i % 2 === 0 ? '#FFFFFF' : '#E6F0FF';
    
    // Create field schema for this row - reuse common properties
    const commonProps = {
      height: rowHeight,
      fontSize: 10,
      fontColor: '#000000',
      backgroundColor
    };
    
    const rowFields = [
      {
        name: `name_${i}`,
        type: 'text',
        position: { x: 30, y: yPosition },
        width: 130,
        alignment: 'left',
        ...commonProps
      },
      {
        name: `age_${i}`,
        type: 'text',
        position: { x: 160, y: yPosition },
        width: 60,
        alignment: 'center',
        ...commonProps
      },
      {
        name: `email_${i}`,
        type: 'text',
        position: { x: 220, y: yPosition },
        width: 180,
        alignment: 'left',
        ...commonProps
      },
      {
        name: `occupation_${i}`,
        type: 'text',
        position: { x: 400, y: yPosition },
        width: 150,
        alignment: 'left',
        ...commonProps
      }
    ];
    
    // Add fields to current page schema
    template.schemas[currentPage].push(...rowFields);
    rowsOnCurrentPage++;
  }
  
  // Cache the template for future use
  templateCache.set(rowCount, { template, maxRows: maxRowsPerPage });
  
  // Generate inputs separately
  const inputs = generateInputs(data, template, rowCount, maxRowsPerPage);
  
  return { template, inputs };
}

// Generate inputs separately for better organization and reuse
function generateInputs(data: RowData[], template: Template, rowCount: number, maxRowsPerPage: number): Record<string, string>[] {
  const totalPages = template.schemas.length;
  
  // Initialize inputs array
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
  
  // Fill in row data
  let currentPage = 0;
  let rowsOnCurrentPage = 0;
  
  data.forEach((rowData, i) => {
    if (rowsOnCurrentPage >= maxRowsPerPage) {
      currentPage++;
      rowsOnCurrentPage = 0;
    }
    
    // Add data to inputs
    inputs[currentPage][`name_${i}`] = rowData.name;
    inputs[currentPage][`age_${i}`] = rowData.age.toString();
    inputs[currentPage][`email_${i}`] = rowData.email;
    inputs[currentPage][`occupation_${i}`] = rowData.occupation;
    
    rowsOnCurrentPage++;
  });
  
  return inputs;
}

// Function to create PDF
async function createPdf(rowCount: number): Promise<{ pdfData: string; metrics: { dataGenerationTime: number; totalTime: number } }> {
  const startTime = performance.now();
  
  // Generate data separately to measure time
  const dataStartTime = performance.now();
  const data = generateDummyData(rowCount);
  const dataGenerationTime = performance.now() - dataStartTime;
  
  const maxRowsPerPage = 30;
  const { template, inputs } = createTemplate(rowCount, maxRowsPerPage);

  // Generate PDF with optimized parameters
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

// Optimized ArrayBuffer to base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Use Uint8Array.reduce is inefficient for large buffers
  // Using TypedArray and TextEncoder/Decoder is more efficient
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 10000; // Process in chunks to avoid call stack issues
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunk.forEach(b => binary += String.fromCharCode(b));
  }
  
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
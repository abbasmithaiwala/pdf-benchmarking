// Import Typst.ts all-in-one API
import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';

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

// Function to create Typst content
function createTypstContent(data: RowData[]): string {
  // Start with document metadata and styling
  let typstContent = `
#set document(title: "Sample PDF Report", author: "Typst Generator")
#set page(margin: 1.5cm)
#set text(font: "New Computer Modern")

= Sample PDF Report
#text(size: 14pt)[Generated with ${data.length} rows of data]

#text(size: 10pt)[This PDF was generated on the client-side using Web Workers and Typst]

/* Create table header with styling */
#let headers = (
  "Name",
  "Age",
  "Email",
  "Occupation"
)

/* Function to create alternating row colors */
#let alt-colors(row) = {
  if calc.odd(row) {
    return white
  } else {
    return rgb(245, 245, 245)
  }
}

/* Create table */
#table(
  columns: (25%, 10%, 40%, 25%),
  inset: 8pt,
  align: (left, center, left, left),
  stroke: 0.7pt,
  fill: (_, row) => if row == 0 { rgb(230, 230, 230) } else { alt-colors(row) },
  [*Name*], [*Age*], [*Email*], [*Occupation*],
`;

  // Add rows to table
  for (const row of data) {
    // Break up the email address to avoid Typst interpreting it as a reference
    // Use Typst's raw text syntax with backticks to treat the text literally
    const emailParts = row.email.split('@');
    const safeEmail = `${emailParts[0]} (at) ${emailParts[1]}`;
    
    typstContent += `
  [${row.name}], [${row.age}], [${safeEmail}], [${row.occupation}],`;
  }

  // Close the table
  typstContent += `
)`;

  return typstContent;
}

// Initialize Typst.ts modules
async function initTypst() {
  try {
    // Set compiler module path directly from CDN with specific version
    const compilerUrl = 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.5.5-rc7/pkg/typst_ts_web_compiler_bg.wasm';
    const rendererUrl = 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.5.5-rc7/pkg/typst_ts_renderer_bg.wasm';
    
    // Log the URLs being used
    console.log("Loading compiler from:", compilerUrl);
    console.log("Loading renderer from:", rendererUrl);
    
    // Configure with async functions to fetch the modules
    $typst.setCompilerInitOptions({
      getModule: async () => {
        try {
          const response = await fetch(compilerUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch compiler WASM: ${response.status} ${response.statusText}`);
          }
          return await response.arrayBuffer();
        } catch (error) {
          console.error("Error fetching compiler WASM:", error);
          throw error;
        }
      }
    });
    
    $typst.setRendererInitOptions({
      getModule: async () => {
        try {
          const response = await fetch(rendererUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch renderer WASM: ${response.status} ${response.statusText}`);
          }
          return await response.arrayBuffer();
        } catch (error) {
          console.error("Error fetching renderer WASM:", error);
          throw error;
        }
      }
    });
    
    // Try a simple SVG generation as a test
    const testSvg = await $typst.svg({ mainContent: "Hello, World!" });
    if (testSvg) {
      console.log("Typst initialization successful - test SVG generated");
    }
    
    console.log("Typst initialization options set successfully");
  } catch (error) {
    console.error("Error setting Typst initialization options:", error);
    throw error;
  }
}

// Function to create PDF document
async function createPdf(rowCount: number) {
  // Start performance measurement
  const startTime = performance.now();
  
  // Generate data
  const data = generateDummyData(rowCount);
  
  // Calculate data generation time
  const dataGenerationTime = performance.now() - startTime;
  
  try {
    // Initialize Typst.ts
    await initTypst();
    
    // Create Typst content
    const typstContent = createTypstContent(data);
    
    console.log("Compiling Typst to PDF...");
    
    // Use Typst.ts to compile the content to PDF
    const pdfBytes = await $typst.pdf({ 
      mainContent: typstContent
    });
    
    console.log("PDF compilation complete:", pdfBytes ? "success" : "failed");
    
    if (!pdfBytes) {
      throw new Error('Failed to generate PDF with Typst');
    }
    
    // Convert to base64
    const pdfBase64 = arrayBufferToBase64(pdfBytes.buffer);
    
    // Calculate total time
    const totalTime = performance.now() - startTime;
    
    return {
      pdfData: pdfBase64,
      metrics: {
        dataGenerationTime,
        totalTime
      }
    };
  } catch (error) {
    console.error('Error compiling Typst:', error);
    throw error;
  }
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
    // Track total time
    const totalStartTime = performance.now();
    
    console.log(`Starting PDF generation with ${rowCount} rows`);
    
    // Create PDF
    const result = await createPdf(rowCount);
    
    // Calculate total time
    const totalTime = performance.now() - totalStartTime;
    
    console.log("PDF generation complete, sending back to main thread");
    
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
    console.error('Error in worker:', error);
    // Provide detailed error information to the main thread
    self.postMessage({ 
      success: false, 
      error: error instanceof Error 
        ? `${error.name}: ${error.message}` 
        : typeof error === 'string' 
          ? error 
          : JSON.stringify(error)
    });
  }
});

// Export empty object to satisfy TypeScript module requirements
export {}; 
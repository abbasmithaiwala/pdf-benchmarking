import { FC, useState, useRef } from 'react';
import './App.css';
import { generatePdf, openPdfInNewTab, downloadPdf, formatTime } from './utils/pdfMakeService';

interface PdfGenerationMetrics {
  dataGenerationTime: number;
  totalTime: number;
  workerStartTime?: number;
  workerEndTime?: number;
  totalProcessTime?: number;
}

interface PdfCardProps {
  label: string;
  onGenerateClick?: (rowCount: number, shouldDownload: boolean, viewType: 'newTab' | 'inline') => Promise<{ metrics: PdfGenerationMetrics, inlinePdfUrl?: string }>;
}

const PdfCard: FC<PdfCardProps> = ({ label, onGenerateClick }) => {
  const [rowCount, setRowCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PdfGenerationMetrics | null>(null);
  const [shouldDownload, setShouldDownload] = useState<boolean>(false);
  const [viewType, setViewType] = useState<'newTab' | 'inline'>('newTab');
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);

  const handleClick = async () => {
    if (onGenerateClick) {
      setIsGenerating(true);
      setError(null);
      setMetrics(null);
      setPdfSrc(null);
      
      try {
        const result = await onGenerateClick(rowCount, shouldDownload, viewType);
        if (result.metrics) {
          setMetrics(result.metrics);
        }
        if (result.inlinePdfUrl) {
          setPdfSrc(result.inlinePdfUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsGenerating(false);
      }
    } else {
      console.log(`${label} functionality not implemented yet`);
    }
  };

  return (
    <div className="card">
      <h2>{label}</h2>
      <div className="card-content">
        <div className="input-group">
          <label htmlFor={`rowCount-${label}`}>Number of Rows:</label>
          <input
            id={`rowCount-${label}`}
            type="number"
            min="1"
            max="10000"
            value={rowCount}
            onChange={(e) => setRowCount(parseInt(e.target.value) || 10)}
          />
        </div>
        
        <div className="options-container">
          <h3>Options</h3>
          <div className="option-group">
            <label>
              <input
                type="checkbox"
                checked={shouldDownload}
                onChange={(e) => setShouldDownload(e.target.checked)}
              />
              Download PDF
            </label>
          </div>
          
          <div className="option-group">
            <p className="option-label">View Mode:</p>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name={`viewType-${label}`}
                  checked={viewType === 'newTab'}
                  onChange={() => setViewType('newTab')}
                />
                New Tab
              </label>
              <label>
                <input
                  type="radio"
                  name={`viewType-${label}`}
                  checked={viewType === 'inline'}
                  onChange={() => setViewType('inline')}
                />
                Inline
              </label>
            </div>
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          onClick={handleClick} 
          disabled={isGenerating}
          className={isGenerating ? 'loading' : ''}
        >
          {isGenerating ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            'Generate PDF'
          )}
        </button>
        
        {metrics && (
          <div className="metrics">
            <h3>Performance Metrics</h3>
            <table>
              <tbody>
                <tr>
                  <td>Data Generation:</td>
                  <td>{formatTime(metrics.dataGenerationTime)}</td>
                </tr>
                <tr>
                  <td>PDF Creation:</td>
                  <td>{formatTime(metrics.totalTime - metrics.dataGenerationTime)}</td>
                </tr>
                <tr>
                  <td>Worker Overhead:</td>
                  <td>{formatTime((metrics.totalProcessTime || 0) - metrics.totalTime)}</td>
                </tr>
                <tr className="total">
                  <td>Total Time:</td>
                  <td>{formatTime(metrics.totalProcessTime || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        {pdfSrc && viewType === 'inline' && (
          <div className="pdf-container">
            <div className="pdf-header">
              <h3>PDF Preview</h3>
            </div>
            <iframe
              src={pdfSrc}
              width="100%"
              height="500px"
              title="PDF Preview"
            ></iframe>
          </div>
        )}
      </div>
    </div>
  );
};

const PdfCards: FC = () => {
  const handlePdfMakeGenerate = async (
    rowCount: number, 
    shouldDownload: boolean,
    viewType: 'newTab' | 'inline'
  ): Promise<{ metrics: PdfGenerationMetrics, inlinePdfUrl?: string }> => {
    try {
      const result = await generatePdf(rowCount);
      let inlinePdfUrl: string | undefined;
      
      if (shouldDownload) {
        downloadPdf(result.pdfData, `pdfmake-report-${rowCount}-rows.pdf`);
      } else if (viewType === 'newTab') {
        openPdfInNewTab(result.pdfData);
      } else if (viewType === 'inline') {
        // Create a blob URL for inline display
        const byteCharacters = atob(result.pdfData);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        inlinePdfUrl = URL.createObjectURL(blob);
      }
      
      return { 
        metrics: result.metrics,
        inlinePdfUrl
      };
    } catch (error) {
      console.error('Error generating PDF with PdfMake:', error);
      throw error;
    }
  };

  return (
    <div className="card-container">
      <PdfCard label="PdfMake" onGenerateClick={handlePdfMakeGenerate} />
      <PdfCard label="Typst" />
      <PdfCard label="PdfLib" />
    </div>
  );
};

export default PdfCards; 
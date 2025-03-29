import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf'; // Reuse jsPDF for regeneration
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import the worker file using Vite's ?url strategy
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; // <-- Changed line

import './PdfEditor.css'; // We'll create this CSS file

// Configure PDF.js worker using the imported URL
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfJsWorker; // <-- Changed line

// Sortable Page Component (Similar to SortableImage)
const SortablePage = ({ page, index, onRemove, onDownload }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: page.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="page-preview">
            <div className="drag-area-pdf" {...attributes} {...listeners}>
                <img src={page.imageDataUrl} alt={`Page ${page.originalPageNum}`} />
                <div className="page-order">{index + 1}</div>
                <div className="original-page-num">Original: {page.originalPageNum}</div>
            </div>
            <div className="page-actions">
                 <button
                    onClick={() => onDownload(page)}
                    className="download-page-btn"
                    type="button"
                    title="Download this page as image"
                >
                    ⬇️ Img
                </button>
                <button
                    onClick={() => onRemove(page.id)}
                    className="remove-page-btn"
                    type="button"
                    title="Remove this page"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};


const PdfEditor = () => {
    const [pdfFile, setPdfFile] = useState(null);
    const [pages, setPages] = useState([]); // Array of { id, originalPageNum, imageDataUrl, width, height }
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [outputPdfName, setOutputPdfName] = useState("edited-pdf");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const clearState = () => {
        setPdfFile(null);
        setPages([]);
        setIsLoading(false);
        setError(null);
        setOutputPdfName("edited-pdf");
    };

    const processPdf = useCallback(async (file) => {
        if (!file) return;
        clearState(); // Clear previous state
        setPdfFile(file);
        setIsLoading(true);
        setError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdfDoc.numPages;
            const extractedPages = [];

            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale for quality/performance
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;

                extractedPages.push({
                    id: `page-${i}-${Date.now()}`, // Unique ID for dnd
                    originalPageNum: i,
                    imageDataUrl: canvas.toDataURL('image/jpeg', 0.9), // Use JPEG for smaller size
                    width: viewport.width, // Store original dimensions (in points at scale 1.5)
                    height: viewport.height,
                });
                 // Clean up canvas? Maybe not needed if it goes out of scope
            }
            setPages(extractedPages);
        } catch (err) {
            console.error("Error processing PDF:", err);
            setError(`Failed to process PDF: ${err.message}. Ensure it's a valid PDF.`);
            setPdfFile(null); // Clear invalid file
        } finally {
            setIsLoading(false);
        }
    }, []);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            if (file.type === 'application/pdf') {
                processPdf(file);
            } else {
                setError("Please upload a valid PDF file.");
            }
        }
    }, [processPdf]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setPages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    return arrayMove(items, oldIndex, newIndex);
                }
                return items; // Return original if indices are invalid
            });
        }
    };

    const removePage = (pageId) => {
        setPages(prevPages => prevPages.filter(p => p.id !== pageId));
    };

    const downloadSinglePage = (page) => {
         // Create a temporary link element
        const link = document.createElement('a');
        link.href = page.imageDataUrl;
        // Suggest a filename (e.g., original-pdf-name_page_1.jpg)
        const baseName = pdfFile?.name.replace(/\.pdf$/i, '') || 'pdf_page';
        link.download = `${baseName}_page_${page.originalPageNum}.jpg`;
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadCombinedPdf = async () => {
        if (pages.length === 0) {
            setError("No pages to combine.");
            return;
        }
        setIsLoading(true); // Show loading state
        setError(null);

        try {
            // Use the dimensions of the *first* page to initialize the PDF
            // This assumes all pages should ideally have similar dimensions,
            // or that fitting to the first page's size is acceptable.
            // For more complex scenarios (mixed orientations/sizes), this needs refinement.
            const firstPage = pages[0];
            // Convert points (at scale 1.5) back to standard PDF points (72 DPI)
            const initialWidthPt = firstPage.width / 1.5;
            const initialHeightPt = firstPage.height / 1.5;

            const pdf = new jsPDF({
                orientation: initialWidthPt > initialHeightPt ? 'l' : 'p',
                unit: 'pt',
                format: [initialWidthPt, initialHeightPt]
            });

            for (let i = 0; i < pages.length; i++) {
                const pageData = pages[i];
                const imgWidthPt = pageData.width / 1.5;
                const imgHeightPt = pageData.height / 1.5;

                if (i > 0) {
                    // Add page with its specific dimensions
                    pdf.addPage([imgWidthPt, imgHeightPt], imgWidthPt > imgHeightPt ? 'l' : 'p');
                } else {
                    // Ensure the first page dimensions are set correctly (redundant but safe)
                     pdf.setPage(1); // Ensure we are on the first page
                     // jsPDF constructor already set the format, no need to resize page 1 again
                }

                // Add the image data URL
                // Using the image's dimensions ensures it fills the page we created for it
                pdf.addImage(pageData.imageDataUrl, 'JPEG', 0, 0, imgWidthPt, imgHeightPt, undefined, 'FAST');
            }

            pdf.save(`${outputPdfName || 'edited-pdf'}.pdf`);

        } catch (err) {
            console.error("Error generating combined PDF:", err);
            setError(`Failed to generate PDF: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="pdf-editor-container">
            <h1>PDF Editor</h1>
            <p className="editor-description">Upload a PDF, rearrange or delete pages, and download the result.</p>

            {!pdfFile && (
                <div {...getRootProps()} className={`dropzone-pdf ${isDragActive ? 'active' : ''}`}>
                    <input {...getInputProps()} />
                    <div className="dropzone-content">
                        <i className="upload-icon">📄</i>
                        {isDragActive ?
                            <p>Drop the PDF file here...</p> :
                            <p>Drag & drop a PDF file here, or click to select</p>
                        }
                    </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {isLoading && <div className="loading-indicator">Processing PDF... Please wait.</div>}

            {pdfFile && !isLoading && pages.length === 0 && !error && (
                 <div className="processing-info">Could not extract pages from the PDF. It might be empty or corrupted.</div>
            )}

            {pages.length > 0 && !isLoading && (
                <div className="editor-area">
                    <div className="editor-header">
                        <h3>Edit Pages ({pages.length})</h3>
                        <div className="output-name-section">
                             <label htmlFor="outputPdfName">Output PDF Name:</label>
                             <input
                                type="text"
                                id="outputPdfName"
                                value={outputPdfName}
                                onChange={(e) => setOutputPdfName(e.target.value)}
                                placeholder="Enter output PDF name"
                             />
                        </div>
                        <div className="action-buttons">
                            <button onClick={downloadCombinedPdf} className="download-all-btn">
                                Download Edited PDF
                            </button>
                            <button onClick={clearState} className="clear-all-btn-pdf">
                                Start Over
                            </button>
                        </div>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={pages} strategy={rectSortingStrategy}>
                            <div className="page-grid">
                                {pages.map((page, index) => (
                                    <SortablePage
                                        key={page.id}
                                        page={page}
                                        index={index}
                                        onRemove={removePage}
                                        onDownload={downloadSinglePage}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            )}
             <footer className="converter-footer"> {/* Reuse footer style */}
                <p>PDF Editor Feature</p>
            </footer>
        </div>
    );
};

export default PdfEditor; 
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import jsPDF from "jspdf";
import heic2any from "heic2any";
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

// SortableImage component
const SortableImage = ({ image, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Separate the remove button from drag listeners
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="image-preview"
    >
      <div
        className="drag-area"
        {...attributes}
        {...listeners}
      >
        <img
          src={URL.createObjectURL(image.file)}
          alt={`Preview ${index + 1}`}
        />
        <div className="image-order">{index + 1}</div>
      </div>
      <button 
        onClick={() => onRemove(image.id)}
        className="remove-btn"
        type="button"
      >
        ✕
      </button>
    </div>
  );
};

const ImageToPdfConverter = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fullPage, setFullPage] = useState(false); // Toggle for conversion mode
  const [pdfName, setPdfName] = useState("converted-images"); // Default PDF name
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle image uploads with HEIC support
  const onDrop = async (acceptedFiles) => {
    try {
      const processedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          // Check if file is HEIC/HEIF format
          if (file.type === "image/heic" || file.type === "image/heif") {
            try {
              // Convert HEIC to JPEG blob
              const jpegBlob = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.85
              });
              
              // Create a new file from the JPEG blob
              return new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                type: "image/jpeg"
              });
            } catch (error) {
              console.error("Error converting HEIC file:", error);
              setError(`Error converting HEIC file: ${file.name}`);
              return null;
            }
          }
          return file;
        })
      );

      // Filter out failed conversions and non-image files
      const imageFiles = processedFiles.filter(file => 
        file && file.type.startsWith('image/')
      );

      // Add id property to each image for drag-and-drop functionality
      const newImages = imageFiles.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file
      }));
      
      setImages((prevImages) => [...prevImages, ...newImages]);
    } catch (error) {
      console.error("Error processing files:", error);
      setError("Error processing files. Please try again.");
    }
  };

  // Handle image reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Update the dropzone configuration to accept HEIC files
  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.heic', '.heif']
    }
  });

  // Remove an image from the list
  const removeImage = (imageId) => {
    setImages(prevImages => {
      const imageToRemove = prevImages.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(URL.createObjectURL(imageToRemove.file));
      }
      return prevImages.filter(img => img.id !== imageId);
    });
  };

  // Add clearAllImages function
  const clearAllImages = () => {
    // Cleanup all object URLs
    images.forEach(image => {
      URL.revokeObjectURL(URL.createObjectURL(image.file));
    });
    setImages([]);
  };

  // Convert images to PDF
  const convertToPdf = async () => {
    try {
      setIsConverting(true);
      let pdf;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.src = URL.createObjectURL(image.file);
          
          img.onload = () => {
            try {
              if (fullPage) {
                // Calculate optimal dimensions (max 2000px width/height while maintaining aspect ratio)
                const MAX_DIMENSION = 2000;
                let finalWidth = img.width;
                let finalHeight = img.height;
                
                if (finalWidth > MAX_DIMENSION || finalHeight > MAX_DIMENSION) {
                  if (finalWidth > finalHeight) {
                    finalHeight = (MAX_DIMENSION * finalHeight) / finalWidth;
                    finalWidth = MAX_DIMENSION;
                  } else {
                    finalWidth = (MAX_DIMENSION * finalWidth) / finalHeight;
                    finalHeight = MAX_DIMENSION;
                  }
                }

                // Initialize PDF with first image
                if (i === 0) {
                  pdf = new jsPDF({
                    orientation: finalWidth > finalHeight ? 'l' : 'p',
                    unit: 'pt',
                    format: [finalWidth, finalHeight]
                  });
                } else {
                  // Add new page for subsequent images
                  pdf.addPage([finalWidth, finalHeight], finalWidth > finalHeight ? 'l' : 'p');
                }
                
                // Create canvas for image compression
                const canvas = document.createElement('canvas');
                canvas.width = finalWidth;
                canvas.height = finalHeight;
                const ctx = canvas.getContext('2d');
                
                // Enable image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw image to canvas with proper scaling
                ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
                
                // Add image to PDF with compression
                pdf.addImage(
                  canvas.toDataURL('image/jpeg', 0.85), // 0.85 quality JPEG
                  'JPEG',
                  0,
                  0,
                  finalWidth,
                  finalHeight,
                  undefined,
                  'FAST'
                );

                // Clean up
                canvas.remove();

                // Save PDF after processing all images
                if (i === images.length - 1) {
                  pdf.save(`${pdfName || 'converted'}.pdf`);
                }
              } else {
                // Canvas mode logic
                if (i === 0) {
                  pdf = new jsPDF();
                }
                
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                const margin = 10;
                let imgWidth = pageWidth - (margin * 2);
                let imgHeight = (img.height * imgWidth) / img.width;
                
                if (imgHeight > pageHeight - (margin * 2)) {
                  imgHeight = pageHeight - (margin * 2);
                  imgWidth = (img.width * imgHeight) / img.height;
                }
                
                const x = (pageWidth - imgWidth) / 2;
                const y = (pageHeight - imgHeight) / 2;
                
                if (i > 0) pdf.addPage();
                
                pdf.addImage(
                  img,
                  'JPEG',
                  x,
                  y,
                  imgWidth,
                  imgHeight,
                  null,
                  'MEDIUM'
                );
                
                // Save PDF after processing all images
                if (i === images.length - 1) {
                  pdf.save(`${pdfName || 'converted'}.pdf`);
                }
              }
              resolve();
            } catch (error) {
              console.error('Error processing image:', error);
              reject(error);
            }
          };
          
          img.onerror = (error) => {
            console.error('Error loading image:', error);
            reject(error);
          };
        });
      }
      
      setIsConverting(false);
    } catch (error) {
      console.error('Error converting to PDF:', error);
      setIsConverting(false);
      setError('Error converting images to PDF. Please try again.');
    }
  };

  return (
    <div className="converter-container">
      <div className="header-section">
        <h1>Image to PDF Converter</h1>
        <div className="disclaimer">
          <p>
            🔒 <strong>Privacy Disclaimer:</strong> This web application processes all data locally in your browser.
            We do not store, collect, or share any of your images or information.
            This is an open-source project focused on user privacy and security.
          </p>
        </div>
      </div>

      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <i className="upload-icon">📁</i>
          <p>Drag & drop images here, or click to select files</p>
          <span className="supported-formats">Supported formats: PNG, JPG, JPEG, GIF, HEIC, HEIF</span>
        </div>
      </div>

      {/* Preview area */}
      {images.length > 0 && (
        <div className="preview-area">
          <div className="preview-header">
            <h3>Selected Images ({images.length})</h3>
            <button 
              onClick={clearAllImages}
              className="clear-all-btn"
              type="button"
            >
              Clear All
            </button>
          </div>
          
          {/* PDF Name Input */}
          <div className="pdf-name-input">
            <label htmlFor="pdfName">PDF Name:</label>
            <input
              type="text"
              id="pdfName"
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              placeholder="Enter PDF name"
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images}
              strategy={rectSortingStrategy}
            >
              <div className="image-grid">
                {images.map((image, index) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    index={index}
                    onRemove={removeImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          <div className="conversion-options">
            <label className="mode-toggle">
              <input
                type="checkbox"
                checked={fullPage}
                onChange={(e) => setFullPage(e.target.checked)}
              />
              <span className="toggle-label">
                {fullPage ? "Full Page Mode" : "Canvas Mode"}
              </span>
            </label>
            <p className="mode-description">
              {fullPage 
                ? "Images will fill entire PDF pages" 
                : "Images will be placed on A4 pages with margins"
              }
            </p>
          </div>
          
          <button
            onClick={convertToPdf}
            disabled={loading}
            className="convert-btn"
          >
            {loading ? 'Converting...' : 'Convert to PDF'}
          </button>
        </div>
      )}

      <footer className="converter-footer">
        <p>
          Made with ❤️ by {" "}
          <a 
            href="https://github.com/Sanskar-Bhushankar"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            Sanskar Bhushankar
          </a>
        </p>
        <a 
          href="https://github.com/Sanskar-Bhushankar"
          target="_blank"
          rel="noopener noreferrer"
          className="follow-button"
        >
          Follow on GitHub
        </a>
      </footer>
    </div>
  );
};

export default ImageToPdfConverter; 
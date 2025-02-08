# Image to PDF Converter

A powerful, privacy-focused web application that converts images to PDF files directly in your browser. Built with React and powered by client-side processing for maximum privacy and security.

Disclaimer - I made it for my personal use, to convert images to PDF files, and I thought it might be useful for others. As other apps have paid plans, I thought I should make this for free for myself and others.


## 🌟 Features

- **Privacy First**: All processing happens locally in your browser - no server uploads required
- **Drag & Drop**: Easy drag-and-drop interface for image uploads
- **Batch Processing**: Convert multiple images at once
- **Image Reordering**: Drag and drop to reorder images before conversion
- **Two Conversion Modes**:
  - Full Page Mode: Each image takes up an entire PDF page
  - Canvas Mode: Images are fitted to A4 pages with margins
- **Custom PDF Naming**: Name your output PDF file
- **Responsive Design**: Works on desktop and mobile devices
- **Format Support**: Accepts JPG, JPEG, PNG, and GIF files
- **Image Optimization**: Automatic compression for optimal PDF file size

## 🚀 Live Demo

Try it out here: [Image to PDF Converter](your-deployment-url) <!-- Add your Vercel deployment URL -->

## 💻 Technologies Used

- React 18
- Vite
- jsPDF
- react-dropzone
- @dnd-kit/core
- HTML5 Canvas API

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/Sanskar-Bhushankar/Image-to-PDF-converter.git
```

2. Navigate to the project directory:
```bash
cd Image-to-PDF-converter
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## 🔧 Usage

1. **Upload Images**:
   - Drag and drop images onto the upload area
   - Or click to select files from your device
   - Supported formats: JPG, JPEG, PNG, GIF

2. **Arrange Images**:
   - Drag and drop images to reorder them
   - Remove individual images using the 'X' button
   - Clear all images using the 'Clear All' button

3. **Configure Settings**:
   - Choose between Full Page or Canvas mode
   - Enter a custom name for your PDF file

4. **Convert**:
   - Click the 'Convert to PDF' button
   - Wait for processing to complete
   - Your PDF will download automatically

## ⚙️ Configuration

The application includes several configurable parameters:

- Maximum image dimensions (default: 2000px)
- JPEG quality (default: 0.85)
- PDF compression level
- Page margins (in Canvas mode)

## 🔒 Privacy

This application:
- Processes all images locally in your browser
- Never uploads files to any server
- Doesn't store or collect any user data
- Is completely open source

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.



## 📧 Contact

Sanskar Bhushankar - [@SanskarBhushankar](https://twitter.com/SanskarBhushankar)

Project Link: [https://github.com/Sanskar-Bhushankar/Image-to-PDF-converter](https://github.com/Sanskar-Bhushankar/Image-to-PDF-converter)

---

Made with ❤️ by [Sanskar Bhushankar](https://github.com/Sanskar-Bhushankar)

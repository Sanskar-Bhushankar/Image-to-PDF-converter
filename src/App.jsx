import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import ImageToPdfConverter from './components/ImageToPdfConverter'
import PdfEditor from './components/PdfEditor'
import './App.css'

function App() {
  return (
    <div className="App">
      <nav className="main-nav">
        <Link to="/">Image to PDF Converter</Link>
        <Link to="/pdf-editor">PDF Editor</Link>
      </nav>

      <Routes>
        <Route path="/" element={<ImageToPdfConverter />} />
        <Route path="/pdf-editor" element={<PdfEditor />} />
      </Routes>
    </div>
  )
}

export default App

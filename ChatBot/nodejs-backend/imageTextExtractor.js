const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 5002;

// Enable CORS (if frontend is running on a different port)
const cors = require("cors");
app.use(cors());

// Set up Multer for image uploads
const upload = multer({ dest: "uploads/" });

// OCR Endpoint
app.post("/extract-text", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const imagePath = path.join(__dirname, "uploads", req.file.filename);

        // Process image using Tesseract.js
        const { data: { text } } = await Tesseract.recognize(imagePath, "eng");

        // Remove the uploaded image after processing
        fs.unlinkSync(imagePath);

        res.json({ success: true, extractedText: text.trim() });
    } catch (error) {
        console.error("OCR Error:", error);
        res.status(500).json({ success: false, message: "Error extracting text" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`OCR service running on http://localhost:${port}`);
});

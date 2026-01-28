// Global state
let pdfDoc = null;
let pageNum = 1;

// DOM Elements
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const textLayer = document.getElementById('text-layer');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');
const pageNumDisplay = document.getElementById('page-num');
const fileInput = document.getElementById('file-input');

// PDF.js worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

/**
 * Shows a toast notification message.
 * @param {string} message The message to display.
 */
function showToast(message) {
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

/**
 * Renders a specific page of the PDF onto the canvas and runs OCR.
 * @param {number} num The page number to render.
 */
async function renderPage(num) {
    if (!pdfDoc) {
        return;
    }
    // Ensure page number is within bounds
    pageNum = Math.max(1, Math.min(num, pdfDoc.numPages));

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    // Set canvas and text layer dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    textLayer.style.height = `${viewport.height}px`;
    textLayer.style.width = `${viewport.width}px`;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    pageNumDisplay.innerText = `${pageNum} / ${pdfDoc.numPages}`;

    // Clear previous OCR results and run new OCR
    textLayer.innerHTML = '';
    runOCR();
}

/**
 * Runs Japanese OCR on the current canvas content and overlays the text.
 */
async function runOCR() {
    loadingOverlay.style.display = 'block';
    try {
        const result = await Tesseract.recognize(canvas, 'jpn', {
            logger: m => console.log(m) // Optional: for debugging OCR progress
        });

        textLayer.innerHTML = ''; // Clear again to be safe

        // Create and position text spans based on OCR data
        result.data.lines.forEach(line => {
            const span = document.createElement('span');
            const b = line.bbox;
            
            // Use pixels for accurate positioning within the textLayer
            span.style.left = `${b.x0}px`;
            span.style.top = `${b.y0}px`;
            span.style.width = `${b.x1 - b.x0}px`;
            span.style.height = `${b.y1 - b.y0}px`;
            
            // Font size based on bounding box height is a good approximation
            span.style.fontSize = `${b.y1 - b.y0}px`;
            span.style.lineHeight = '1'; // Important for vertical alignment

            span.innerText = line.text;
            textLayer.appendChild(span);
        });

    } catch (error) {
        console.error("OCR failed:", error);
        showToast("Error durante el OCR.");
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Handles PDF file selection and loading.
 * @param {Event} e The change event from the file input.
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = function() {
        const data = new Uint8Array(this.result);
        pdfjsLib.getDocument(data).promise.then(pdf => {
            pdfDoc = pdf;
            renderPage(1); // Start with the first page
        });
    };
    reader.readAsArrayBuffer(file);
}

// --- Event Listeners ---

// 1. File and Navigation Controls
document.getElementById('btn-open').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

document.getElementById('prev').addEventListener('click', () => {
    if (pdfDoc && pageNum > 1) {
        renderPage(--pageNum);
    }
});

document.getElementById('next').addEventListener('click', () => {
    if (pdfDoc && pageNum < pdfDoc.numPages) {
        renderPage(++pageNum);
    }
});

// 2. Action Buttons (Translate, Listen)
document.getElementById('btn-translate').addEventListener('click', () => {
    const text = window.getSelection().toString().trim();
    if (text) {
        const url = `https://www.deepl.com/translator#ja/es/${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    } else {
        showToast("Selecciona texto primero");
    }
});

document.getElementById('btn-listen').addEventListener('click', () => {
    const text = window.getSelection().toString().trim();
    if (text) {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'ja-JP';
        window.speechSynthesis.speak(msg);
    } else {
        showToast("Selecciona texto primero");
    }
});

// 3. Auto-copy on selection
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) {
        navigator.clipboard.writeText(selection).then(() => {
            console.log("Copiado al portapapeles:", selection);
            // Opcional: showToast("Texto copiado");
        }).catch(err => {
            console.error("No se pudo copiar el texto: ", err);
        });
    }
});

// 4. Dark Mode Toggle
document.getElementById('dark-switch').addEventListener('change', e => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    // This filter is a simple but effective way to invert PDF colors for dark mode.
    canvas.style.filter = e.target.checked ? "invert(1) hue-rotate(180deg)" : "none";
});
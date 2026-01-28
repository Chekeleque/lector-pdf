// Global state
let pdfDoc = null;
let pageNum = 1;

// DOM Elements
const canvas = document.getElementById('main-canvas');
const lensLayer = document.getElementById('lens-layer');
const ocrBar = document.getElementById('ocr-bar');
const menu = document.getElementById('lens-action-menu');
const pageInfo = document.getElementById('page-info');
const fileInput = document.getElementById('pdf-upload');

// PDF.js worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

/**
 * Renders a specific page of the PDF onto the canvas and runs OCR.
 * @param {number} num The page number to render.
 */
async function renderPage(num) {
    if (!pdfDoc) return;
    pageNum = num;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 }); // High quality for OCR

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    lensLayer.style.height = `${viewport.height}px`;
    lensLayer.style.width = `${viewport.width}px`;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;

    pageInfo.innerText = `${pageNum} / ${pdfDoc.numPages}`;

    // Run OCR in the background
    runLensOCR();
}

/**
 * Runs Japanese OCR on the current canvas content and overlays the text.
 */
async function runLensOCR() {
    lensLayer.innerHTML = '';
    ocrBar.style.opacity = '1';
    ocrBar.style.width = '10%';

    try {
        const result = await Tesseract.recognize(canvas, 'jpn', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    ocrBar.style.width = `${10 + (m.progress * 90)}%`;
                }
            }
        });

        result.data.lines.forEach(line => {
            const span = document.createElement('span');
            span.className = 'ocr-block';
            const b = line.bbox;
            span.style.left = `${b.x0}px`;
            span.style.top = `${b.y0}px`;
            span.style.width = `${b.x1 - b.x0}px`;
            span.style.height = `${b.y1 - b.y0}px`;
            span.style.fontSize = `${b.y1 - b.y0}px`;
            span.innerText = line.text;
            lensLayer.appendChild(span);
        });
    } catch (error) {
        console.error("OCR failed:", error);
        // Aquí se podría mostrar una notificación al usuario
    } finally {
        ocrBar.style.width = '100%';
        setTimeout(() => {
            ocrBar.style.opacity = '0';
            // Resetea el ancho después de la transición para la próxima vez
            setTimeout(() => { ocrBar.style.width = '0%'; }, 500);
        }, 600);
    }
}

/**
 * Handles PDF file selection and loading.
 * @param {Event} e The change event from the file input.
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function() {
        const data = new Uint8Array(this.result);
        pdfjsLib.getDocument(data).promise.then(pdf => {
            pdfDoc = pdf;
            pageNum = 1; // Resetea a la primera página
            renderPage(pageNum);
        });
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Changes the current page.
 * @param {number} delta The change in page number (-1 for prev, 1 for next).
 */
function changePage(delta) {
    if (!pdfDoc) return; // Cláusula de guarda para evitar errores
    const newPageNum = pageNum + delta;
    if (newPageNum > 0 && newPageNum <= pdfDoc.numPages) {
        renderPage(newPageNum);
    }
}

/**
 * Toggles dark mode.
 */
function toggleDark() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    canvas.style.filter = isDarkMode ? "invert(1) hue-rotate(180deg)" : "none";
}

// --- Funciones del Menú de Acción ---

function getSelectedText() {
    return window.getSelection().toString().trim();
}

function copyLensText() {
    const text = getSelectedText();
    if (text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log("Texto copiado.");
            // Opcional: mostrar una notificación de "copiado"
        }).catch(err => {
            console.error("No se pudo copiar el texto: ", err);
        });
    }
    window.getSelection().removeAllRanges(); // Deseleccionar texto
    menu.style.display = 'none'; // Ocultar menú
}

function translateDeepL() {
    const text = getSelectedText();
    if (text) {
        // Usar ja/es específicamente ya que el OCR es para japonés
        window.open(`https://www.deepl.com/translator#ja/es/${encodeURIComponent(text)}`, '_blank');
    }
    window.getSelection().removeAllRanges();
    menu.style.display = 'none';
}

function googleSearch() {
    const text = getSelectedText();
    if (text) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
    }
    window.getSelection().removeAllRanges();
    menu.style.display = 'none';
}

function speakJapanese() {
    const text = getSelectedText();
    if (text) {
        // Cancelar cualquier voz anterior para evitar solapamientos
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'ja-JP';
        window.speechSynthesis.speak(msg);
    }
    // No ocultamos el menú para permitir que el usuario vuelva a hacer clic.
    // Se ocultará cuando la selección de texto desaparezca.
}

// --- Configuración de Event Listeners ---

// 1. File and Navigation Controls
document.getElementById('btn-open').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
document.getElementById('btn-prev').addEventListener('click', () => changePage(-1));
document.getElementById('btn-next').addEventListener('click', () => changePage(1));
document.getElementById('btn-dark-toggle').addEventListener('click', toggleDark);

// 2. Action Menu Buttons
document.getElementById('btn-copy').addEventListener('click', copyLensText);
document.getElementById('btn-translate').addEventListener('click', translateDeepL);
document.getElementById('btn-speak').addEventListener('click', speakJapanese);
document.getElementById('btn-search').addEventListener('click', googleSearch);

// 3. Muestra/Oculta el menú de acción al seleccionar texto
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    const text = sel.toString().trim();

    if (text.length > 0 && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        // Asegurarse de que la selección está dentro de nuestra capa de texto
        if (lensLayer.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            const menuHeight = 50; // Altura aproximada del menú para posicionarlo

            menu.style.display = 'flex';

            // Posicionar el menú arriba, pero cambiarlo abajo si no hay espacio
            if (rect.top < menuHeight + 10) { // Añadir un poco de margen
                menu.style.top = `${rect.bottom + 10}px`;
            } else {
                menu.style.top = `${rect.top - menuHeight}px`;
            }

            // Centrar el menú horizontalmente sobre la selección
            const menuWidth = menu.offsetWidth;
            const viewportWidth = document.documentElement.clientWidth;
            let menuLeft = rect.left + (rect.width / 2) - (menuWidth / 2);

            // Evitar que se salga por la izquierda
            menuLeft = Math.max(10, menuLeft);
            // Evitar que se salga por la derecha
            if (menuLeft + menuWidth + 10 > viewportWidth) {
                menuLeft = viewportWidth - menuWidth - 10;
            }
            menu.style.left = `${menuLeft}px`;
        }
    } else {
        menu.style.display = 'none';
    }
});
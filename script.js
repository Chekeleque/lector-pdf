let pdfDoc = null;
let pageNum = 1;
let canvas = document.getElementById('pdf-canvas');
let ctx = canvas.getContext('2d');
let ocrData = []; // Almacena los bloques de texto detectados
let textoSeleccionado = "";

// Configuración necesaria para PDF.js en navegador
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 1. Abrir PDF
document.getElementById('btnAbrirPdf').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            pageNum = 1;
            renderPage(pageNum);
        });
    };
    reader.readAsArrayBuffer(file);
});

// 2. Renderizar Página
function renderPage(num) {
    // Ocultar menú si estaba abierto
    const menu = document.getElementById('menu-flotante');
    if (menu) menu.style.display = 'none';
    
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({scale: 1.5});
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        page.render({canvasContext: ctx, viewport: viewport}).promise.then(() => {
            document.getElementById('txtPagina').innerText = `${num} / ${pdfDoc.numPages}`;
            ejecutarOCR(); 
        });
    });
}

// 3. OCR Japonés
async function ejecutarOCR() {
    console.log("Iniciando OCR en página " + pageNum + "...");
    const { data } = await Tesseract.recognize(canvas, 'jpn', {
        logger: m => console.log(m)
    });
    
    ocrData = data.words; 
    console.log("OCR Completado. Bloques detectados:", ocrData.length);
}

// 4. Interacción: Detectar clic en texto
canvas.addEventListener('click', (e) => {
    if (ocrData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const palabraTocada = ocrData.find(w => 
        x >= w.bbox.x0 && x <= w.bbox.x1 &&
        y >= w.bbox.y0 && y <= w.bbox.y1
    );

    const menu = document.getElementById('menu-flotante');
    if (palabraTocada) {
        textoSeleccionado = palabraTocada.text;
        console.log("Seleccionado:", textoSeleccionado);
        
        menu.style.left = (e.pageX + 10) + 'px';
        menu.style.top = (e.pageY + 10) + 'px';
        menu.style.display = 'flex';
    } else {
        menu.style.display = 'none';
    }
});

// 5. Botones de Acción del Menú
document.getElementById('btnCopiar').addEventListener('click', () => {
    navigator.clipboard.writeText(textoSeleccionado);
    alert("Copiado: " + textoSeleccionado);
    document.getElementById('menu-flotante').style.display = 'none';
});

document.getElementById('btnTraducir').addEventListener('click', () => {
    const url = `https://www.deepl.com/translator#any/es/${encodeURIComponent(textoSeleccionado)}`;
    window.open(url, '_blank');
    document.getElementById('menu-flotante').style.display = 'none';
});

document.getElementById('btnEscuchar').addEventListener('click', () => {
    const utterance = new SpeechSynthesisUtterance(textoSeleccionado);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
    document.getElementById('menu-flotante').style.display = 'none';
});

// 6. Controles de Navegación y Modo Oscuro
document.getElementById('btnAnterior').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
});

document.getElementById('btnSiguiente').addEventListener('click', () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    renderPage(pageNum);
});

document.getElementById('switchOscuro').addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    canvas.style.filter = e.target.checked ? "invert(1) hue-rotate(180deg)" : "none";
});
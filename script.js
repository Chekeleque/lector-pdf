let pdfDoc = null, pageNum = 1, canvas = document.getElementById('pdf-canvas'), ctx = canvas.getContext('2d');

[span_7](start_span)// 1. Abrir PDF (Equivalente a selectorPdf en Kotlin[span_7](end_span))
document.getElementById('btnAbrirPdf').addEventListener('change', (e) => {
    const file = e.target.files[0];
        const reader = new FileReader();
            reader.onload = function() {
                    const typedarray = new Uint8Array(this.result);
                            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                                        pdfDoc = pdf;
                                                    document.getElementById('txtPagina').innerText = `1 / ${pdf.numPages}`;
                                                                renderPage(1);
                                                                        });
                                                                            };
                                                                                reader.readAsArrayBuffer(file);
                                                                                });

                                                                                [span_8](start_span)// 2. Renderizar Página (Equivalente a mostrarPagina[span_8](end_span))
                                                                                function renderPage(num) {
                                                                                    pdfDoc.getPage(num).then(page => {
                                                                                            const viewport = page.getViewport({scale: 1.5});
                                                                                                    canvas.height = viewport.height;
                                                                                                            canvas.width = viewport.width;
                                                                                                                    
                                                                                                                            page.render({canvasContext: ctx, viewport: viewport}).promise.then(() => {
                                                                                                                                        ejecutarOCR(); // Llama al OCR tras dibujar la página
                                                                                                                                                });
                                                                                                                                                    });
                                                                                                                                                    }

                                                                                                                                                    [span_9](start_span)// 3. OCR Japonés (Equivalente a procesarOCR con ML Kit[span_9](end_span))
                                                                                                                                                    async function ejecutarOCR() {
                                                                                                                                                        console.log("Iniciando OCR...");
                                                                                                                                                            const { data: { text } } = await Tesseract.recognize(canvas, 'jpn');
                                                                                                                                                                console.log("Texto detectado:", text);
                                                                                                                                                                    [span_10](start_span)// Aquí puedes añadir la lógica para copiar o traducir como en tu código original[span_10](end_span)
                                                                                                                                                                    }

                                                                                                                                                                    [span_11](start_span)// 4. Modo Oscuro (Equivalente a aplicarFiltroOscuro[span_11](end_span))
                                                                                                                                                                    document.getElementById('switchOscuro').addEventListener('change', (e) => {
                                                                                                                                                                        document.body.classList.toggle('dark-mode', e.target.checked);
                                                                                                                                                                            canvas.style.filter = e.target.checked ? "invert(1) hue-rotate(180deg)" : "none";
                                                                                                                                                                            });
                                                                                                                                                                            
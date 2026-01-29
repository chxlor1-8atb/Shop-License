const PdfPrinter = require('pdfmake');
console.log('Type of PdfPrinter:', typeof PdfPrinter);
console.log('PdfPrinter prototype:', PdfPrinter.prototype);
try {
    const fonts = { Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' } };
    const printer = new PdfPrinter(fonts);
    console.log('Instance created successfully');
} catch (e) {
    console.log('Error creating instance:', e);
}

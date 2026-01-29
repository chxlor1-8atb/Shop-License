const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

// Define fonts
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');
console.log('FONTS_DIR:', FONTS_DIR);

const fonts = {
    THSarabunNew: {
        normal: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bold: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf'),
        italics: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bolditalics: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf')
    },
    // Required fallback for pdfmake
    Roboto: {
        normal: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bold: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf'),
        italics: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bolditalics: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf')
    }
};

console.log('Fonts config:', JSON.stringify(fonts, null, 2));

try {
    const printer = new PdfPrinter(fonts);

    const docDefinition = {
        content: [
            { text: 'Hello World', font: 'THSarabunNew' }
        ],
        defaultStyle: {
            font: 'THSarabunNew'
        }
    };

    const doc = printer.createPdfKitDocument(docDefinition);
    doc.end();

    console.log('PDF generation initiated successfully.');

    // Consume the stream to ensure it actually processes
    doc.on('data', () => { });
    doc.on('end', () => console.log('PDF generation finished successfully.'));
    doc.on('error', (err) => {
        console.error('PDF Stream Error:', err);
    });

} catch (e) {
    console.error('Catch Error:', e);
}

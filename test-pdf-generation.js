const PdfPrinter = require('pdfmake/src/printer'); // Valid for server-side
const path = require('path');
const fs = require('fs');

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');
console.log('Fonts Directory:', FONTS_DIR);

const fonts = {
    THSarabunNew: {
        normal: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bold: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf'),
        italics: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bolditalics: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf')
    },
    Roboto: {
        normal: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bold: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf'),
        italics: path.join(FONTS_DIR, 'THSarabunNew.ttf'),
        bolditalics: path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf')
    }
};

try {
    const printer = new PdfPrinter(fonts);
    console.log('Printer initialized successfully');

    const docDefinition = {
        content: [
            { text: 'Test PDF', fontSize: 15 }
        ],
        defaultStyle: {
            font: 'THSarabunNew'
        }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream('test-output.pdf'));
    pdfDoc.end();
    console.log('PDF generation started...');
} catch (err) {
    console.error('Error during PDF generation:', err);
}

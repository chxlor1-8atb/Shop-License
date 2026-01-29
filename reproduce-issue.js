const PdfPrinter = require('pdfmake/js/Printer').default;
const path = require('path');
const fs = require('fs');

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');
console.log('Fonts Directory:', FONTS_DIR);

const getFontPath = (filename) => {
    const filePath = path.join(FONTS_DIR, filename);
    if (fs.existsSync(filePath)) {
        return filePath;
    }
    console.warn(`Font file not found: ${filePath}`);
    return null;
};

const fonts = {
    THSarabunNew: {
        normal: fs.readFileSync(getFontPath('THSarabunNew.ttf')),
        bold: fs.readFileSync(getFontPath('THSarabunNew-Bold.ttf')),
        italics: fs.readFileSync(getFontPath('THSarabunNew.ttf')),
        bolditalics: fs.readFileSync(getFontPath('THSarabunNew-Bold.ttf'))
    },
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

// Fallback logic
if (!fonts.THSarabunNew.normal) {
    console.log('Using Helvetica fallback');
    fonts.THSarabunNew = {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    };
}

(async () => {
    try {
        const printer = new PdfPrinter(fonts);
        console.log('Printer initialized successfully');

        const docDefinition = {
            content: [
                { text: 'Test PDF Generation', font: 'THSarabunNew', fontSize: 20 },
                { text: 'ภาษาไทย', font: 'THSarabunNew', fontSize: 16 }
            ],
            defaultStyle: {
                font: 'THSarabunNew'
            }
        };

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);
        const writeStream = fs.createWriteStream('test_server_gen.pdf');
        pdfDoc.pipe(writeStream);
        pdfDoc.end();

        writeStream.on('finish', () => {
            console.log('PDF generated successfully: test_server_gen.pdf');
        });

    } catch (err) {
        console.error('Test FAILED:', err);
    }
})();

try {
    const PdfPrinterMetadata = require('pdfmake/js/Printer');
    console.log('Required pdfmake/js/Printer:', PdfPrinterMetadata);

    // Check if it has default export
    if (PdfPrinterMetadata.default) {
        console.log('Found default export. Is it a constructor?', typeof PdfPrinterMetadata.default === 'function');
        const printer = new PdfPrinterMetadata.default({ Roboto: { normal: 'Arial.ttf' } });
        console.log('Successfully created printer via .default');
    } else {
        console.log('No default export found on Printer module');
    }

} catch (e) {
    console.error('Error requiring Printer:', e);
}

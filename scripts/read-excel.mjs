import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('C:\\Users\\Admin\\Downloads\\อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx');

const workbook = XLSX.readFile(filePath);

console.log('=== Sheet Names ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
    console.log(`\n=== Sheet: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Print headers (first row)
    console.log('Headers (Row 1):', JSON.stringify(jsonData[0], null, 2));
    
    // Print first 3 data rows
    console.log('\nFirst 3 data rows:');
    for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
        console.log(`Row ${i}:`, JSON.stringify(jsonData[i], null, 2));
    }
    
    console.log(`\nTotal rows: ${jsonData.length}`);
}

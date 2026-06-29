import XLSX from 'xlsx';
import path from 'path';

const EXCEL_PATH = path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx');
const wb = XLSX.readFile(EXCEL_PATH);
const sh = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
const dataRows = rows.slice(2).filter(r => r[0] !== '' && r[0] !== undefined);

// เช็ค duplicate ภายในไฟล์
const seen = new Map(); // license_number → [seq...]
for (const row of dataRows) {
    const seq = row[0];
    const volume = row[4];
    const number = row[5];
    if (volume === '' || number === '') continue;
    const ln = `${volume}/${number}`;
    if (!seen.has(ln)) seen.set(ln, []);
    seen.get(ln).push(seq);
}

const dupInFile = [...seen.entries()].filter(([ln, seqs]) => seqs.length > 1);
console.log(`=== Duplicate ภายในไฟล์เอง: ${dupInFile.length} เลขที่ ===`);
for (const [ln, seqs] of dupInFile.slice(0, 30)) {
    // ดึงข้อมูลแต่ละแถวที่ซ้ำ
    const details = seqs.map(s => {
        const r = dataRows.find(r => r[0] === s);
        return `#${s} ${String(r[1]||'').trim()} (${String(r[2]||'').trim()})`;
    });
    console.log(`  ${ln}: ${details.join(' | ')}`);
}
if (dupInFile.length > 30) console.log(`  ... และอีก ${dupInFile.length - 30} รายการ`);

console.log(`\nรวม: unique ${seen.size} เลขที่, ซ้ำ ${dupInFile.length} เลขที่ (เก็บอันแรก ข้ามอันหลัง)`);

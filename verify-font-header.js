const fs = require('fs');
const path = require('path');

const fontsDir = path.join(process.cwd(), 'public', 'fonts');
const fontPath = path.join(fontsDir, 'THSarabunNew-Bold.ttf');

console.log('Checking font:', fontPath);

try {
    const buffer = fs.readFileSync(fontPath);
    console.log('File size:', buffer.length);
    console.log('First 4 bytes (hex):', buffer.slice(0, 4).toString('hex'));

    // TTF usually starts with 00 01 00 00
    // OTF usually starts with 4F 54 54 4F (OTTO)

    // Check normal font too
    const normalPath = path.join(fontsDir, 'THSarabunNew.ttf');
    const normalBuffer = fs.readFileSync(normalPath);
    console.log('Normal font size:', normalBuffer.length);
    console.log('Normal font hex:', normalBuffer.slice(0, 4).toString('hex'));

} catch (e) {
    console.error('Error reading font:', e);
}

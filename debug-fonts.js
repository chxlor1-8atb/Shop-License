const path = require('path');
const fs = require('fs');

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');
console.log('Current Working Directory:', process.cwd());
console.log('Fonts Directory:', FONTS_DIR);

const boldFontPath = path.join(FONTS_DIR, 'THSarabunNew-Bold.ttf');
console.log('Checking Bold Font Path:', boldFontPath);

if (fs.existsSync(boldFontPath)) {
    console.log('SUCCESS: Bold font found!');
} else {
    console.log('ERROR: Bold font NOT found!');
    // List directory content if possible
    try {
        if (fs.existsSync(FONTS_DIR)) {
            console.log('Contents of fonts dir:', fs.readdirSync(FONTS_DIR));
        } else {
            console.log('Fonts dir does not exist');
        }
    } catch (e) {
        console.log('Error listing directory:', e);
    }
}

const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = [
    {
        sources: [
            "https://github.com/inwdragon/thsn-for-ubuntu/raw/master/THSarabunNew.ttf",
            "https://github.com/kowat-e/Thai-Font-Collection/raw/master/TH%20Sarabun%20New/THSarabunNew.ttf",
            "https://github.com/mrapir/Thai-Font-Collection/raw/master/TH%20Sarabun%20New/THSarabunNew.ttf"
        ],
        dest: "public/fonts/THSarabunNew.ttf"
    },
    {
        sources: [
            "https://github.com/inwdragon/thsn-for-ubuntu/raw/master/THSarabunNew%20Bold.ttf",
            "https://github.com/kowat-e/Thai-Font-Collection/raw/master/TH%20Sarabun%20New/THSarabunNew%20Bold.ttf",
            "https://github.com/mrapir/Thai-Font-Collection/raw/master/TH%20Sarabun%20New/THSarabunNew%20Bold.ttf"
        ],
        dest: "public/fonts/THSarabunNew-Bold.ttf"
    }
];

function downloadFromSource(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFromSource(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => { });
                reject(new Error(`Status ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    const stats = fs.statSync(dest);
                    if (stats.size < 1000) { // Suspiciously small
                        resolve(false); // Treat as failed
                        return;
                    }
                    // Basic Magic Number Check
                    const fd = fs.openSync(dest, 'r');
                    const buffer = Buffer.alloc(4);
                    fs.readSync(fd, buffer, 0, 4, 0);
                    fs.closeSync(fd);
                    const hex = buffer.toString('hex');
                    if (hex === '00010000' || hex === '4f54544f') {
                        console.log(`✅ Success: ${url}`);
                        resolve(true);
                    } else {
                        console.warn(`❌ Invalid Header (${hex}): ${url}`);
                        resolve(false);
                    }
                });
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

(async () => {
    try {
        console.log('Starting font download...');
        const dir = path.dirname(fonts[0].dest);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        for (const font of fonts) {
            console.log(`\nProcessing ${path.basename(font.dest)}...`);
            let success = false;
            for (const source of font.sources) {
                try {
                    console.log(`Trying ${source}...`);
                    success = await downloadFromSource(source, font.dest);
                    if (success) break;
                } catch (e) {
                    console.log(`Failed: ${e.message}`);
                }
            }
            if (!success) {
                console.error(`FAILED to download ${font.dest} from all sources.`);
            }
        }
        console.log('\nDownload process completed.');
    } catch (err) {
        console.error('Script Error:', err);
    }
})();

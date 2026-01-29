const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(process.cwd(), 'public', 'fonts');

// Ensure directory exists
if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
    {
        name: 'THSarabunNew.ttf',
        url: 'https://github.com/wannaphong/thai-font-collection/raw/master/THSarabunNew/THSarabunNew.ttf'
    },
    {
        name: 'THSarabunNew-Bold.ttf',
        url: 'https://github.com/wannaphong/thai-font-collection/raw/master/THSarabunNew/THSarabunNew%20Bold.ttf'
    }
];

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        console.log(`Downloading ${url} to ${dest}...`);

        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirect manually if needed, though mostly standard libs track it. 
                // Simple https.get doesn't follow redirects automatically.
                console.log(`Redirecting to ${response.headers.location}`);
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log(`Download completed: ${dest}`);
                    resolve();
                });
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function main() {
    for (const font of fonts) {
        const destPath = path.join(fontsDir, font.name);

        // Remove existing file if it exists
        if (fs.existsSync(destPath)) {
            console.log(`Removing existing corrupted file: ${destPath}`);
            fs.unlinkSync(destPath);
        }

        try {
            await downloadFile(font.url, destPath);
        } catch (error) {
            console.error(`Error downloading ${font.name}:`, error);
        }
    }
}

main();

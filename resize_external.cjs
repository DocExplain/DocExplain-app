const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const dir = "C:\\Users\\nicol\\Downloads\\screenshots documate";
const targetWidth = 1284;
const targetHeight = 2778;

async function resizeImages() {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && !f.includes('_resized'));
    console.log(`Found ${files.length} images to resize in ${dir}`);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const outPath = path.join(dir, file.replace('.png', '_resized.png'));

        console.log(`Resizing ${file}...`);
        try {
            const image = await Jimp.read(filePath);
            await image.resize(targetWidth, targetHeight);
            
            // Mask status bar (top 100px)
            const maskColor = 0xFFFFFFFF; // White
            for (let x = 0; x < targetWidth; x++) {
                for (let y = 0; y < 100; y++) {
                    image.setPixelColor(maskColor, x, y);
                }
            }

            // Mask bottom bar (bottom 100px)
            for (let x = 0; x < targetWidth; x++) {
                for (let y = targetHeight - 100; y < targetHeight; y++) {
                    image.setPixelColor(maskColor, x, y);
                }
            }

            await image.writeAsync(outPath);

            // Delete original and rename to keep the same name
            fs.unlinkSync(filePath);
            fs.renameSync(outPath, filePath);

        } catch (e) {
            console.error(`Failed to resize ${file}:`, e);
        }
    }
    console.log('Done!');
}

resizeImages();

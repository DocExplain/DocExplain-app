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
            await image.resize(targetWidth, targetHeight).writeAsync(outPath);

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

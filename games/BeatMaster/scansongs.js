const fs = require('fs');
const path = require('path');

const DIRS_TO_SCAN = [
    { path: 'songs', prefix: 'songs/' },
    { path: 'public/assets/midi', prefix: 'public/assets/midi/' }
];
const OUTPUT_FILE = 'songs.json';

const songList = [];

console.log("Scanning for MIDI files...");

DIRS_TO_SCAN.forEach(dirConfig => {
    const fullPath = path.join(__dirname, dirConfig.path);
    if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
            if (file.toLowerCase().endsWith('.mid') || file.toLowerCase().endsWith('.midi')) {
                // Formatting Name: remove extension, replace _ with space, icons?
                let name = file.replace(/\.mid(i)?$/i, '').replace(/_/g, ' ');

                // Optional: Add icons based on keywords
                if (name.toLowerCase().includes('drum')) name = "🥁 " + name;
                else if (name.toLowerCase().includes('stage')) name = "🎵 " + name;
                else if (name.toLowerCase().includes('victory')) name = "🏆 " + name;
                else if (name.toLowerCase().includes('gameover')) name = "💀 " + name;
                else if (name.toLowerCase().includes('setting')) name = "⚙️ " + name;
                else name = "🎹 " + name;

                songList.push({
                    name: name,
                    url: dirConfig.prefix + file
                });
                console.log(`Found: ${file}`);
            }
        });
    } else {
        console.warn(`Directory not found: ${dirConfig.path}`);
    }
});

fs.writeFileSync(path.join(__dirname, OUTPUT_FILE), JSON.stringify(songList, null, 2));
console.log(`\nSaved ${songList.length} songs to ${OUTPUT_FILE}`);

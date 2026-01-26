
import Link from 'https';

const https = Link;

const API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ API Key is missing");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log("Checking available models...");
console.log(`URL: https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY.substring(0, 5)}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (res.statusCode !== 200) {
                console.error(`❌ Error ${res.statusCode}:`, json);
            } else {
                console.log("✅ Custom Models List retrieved successfully!");
                if (json.models) {
                    console.log("Available Models:");
                    json.models.forEach(m => console.log(` - ${m.name} (${m.supportedGenerationMethods})`));
                } else {
                    console.log("No models found in response.");
                    console.log(json);
                }
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Raw output:", data);
        }
    });
}).on('error', (err) => {
    console.error("Network Error:", err);
});

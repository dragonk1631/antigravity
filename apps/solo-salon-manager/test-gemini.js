
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GEMINI_API_KEY;

console.log("Checking API Key...");
if (!API_KEY) {
    console.error("❌ API Key is missing in .env");
    process.exit(1);
}
console.log("✅ API Key found (starts with):", API_KEY.substring(0, 5) + "...");

const genAI = new GoogleGenerativeAI(API_KEY);

async function testGemini() {
    console.log("\n--- Starting Gemini API Test ---");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = "Hello, are you working? Reply with 'Yes, I am working!' in Korean.";

        console.log("Sending prompt to Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Response received:");
        console.log(text);
        console.log("\n🎉 GEMINI API TEST COMPLETED SUCCESSFULLY");

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error);
    }
}

testGemini();

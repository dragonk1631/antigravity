
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.warn("⚠️ Google Gemini API Key is missing!");
}

/**
 * Converts a File object to a GoogleGenerativeAI InlineDataPart
 */
async function fileToGenerativePart(file: File) {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const aiService = {
    /**
     * Generates an Instagram caption and hashtags based on the image
     */
    async generateCaption(imageFile: File): Promise<string> {
        if (!genAI) throw new Error("API Key 미설정");

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const imagePart = await fileToGenerativePart(imageFile);

        const prompt = `
        당신은 뷰티샵(네일, 속눈썹 등) 전문 SNS 마케터입니다.
        이 사진을 보고 인스타그램에 올릴 감성적이고 트렌디한 게시글을 작성해주세요.
        
        조건:
        1. 시술의 특징을 잘 파악해서 칭찬해주세요.
        2. 이모지를 적절히 사용하여 친근하게 작성해주세요.
        3. 마지막에는 관련 해시태그를 10개 이상 추천해주세요.
        4. 한국어로 작성해주세요.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return response.text();
    },

    /**
     * Generates a text message based on the scenario
     */
    async generateMessage(scenario: string, details: string = ""): Promise<string> {
        if (!genAI) throw new Error("API Key 미설정");

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        당신은 프로페셔널하고 친절한 뷰티샵 원장님입니다.
        아래 상황에 맞는 고객 문자 메시지를 작성해주세요.

        상황: ${scenario}
        추가 정보: ${details}

        조건:
        1. 매우 정중하고 친절한 어조로 작성해주세요.
        2. 너무 길지 않게, 핵심 내용을 전달하세요.
        3. 고객의 기분을 상하게 하지 않도록 주의하세요.
        4. 한국어로 작성해주세요.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
};

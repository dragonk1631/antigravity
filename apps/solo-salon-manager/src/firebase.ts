import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// [DEBUG] Check if keys are loaded
console.log("🔥 Firebase Config Status:", {
    apiKey: firebaseConfig.apiKey ? "Loaded ✅" : "MISSING ❌",
    projectId: firebaseConfig.projectId ? "Loaded ✅" : "MISSING ❌",
    authDomain: firebaseConfig.authDomain ? "Loaded ✅" : "MISSING ❌"
});

if (!firebaseConfig.apiKey) {
    console.error("⛔ Critical Error: Firebase API Key is missing. Check your .env file!");
    alert("설정 오류: .env 파일에 Firebase 키가 없습니다. 개발자 도구(F12) 콘솔을 확인하세요.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

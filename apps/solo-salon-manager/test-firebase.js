
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, limit } from "firebase/firestore";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables manually since we are running a standalone script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

console.log("Checking Config...");
if (!firebaseConfig.apiKey) {
    console.error("❌ API Key is missing. Check .env file path and contents.");
    process.exit(1);
}
console.log("✅ Config Loaded. Project ID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testConnection() {
    console.log("\n--- Starting Firebase Connection Test ---");
    try {
        // 1. Write Test
        console.log("Attempting to write a test reservation...");
        const testData = {
            customerName: "Test Bot",
            phoneNumber: "000-0000-0000",
            date: new Date().toISOString().split('T')[0],
            time: "12:00",
            serviceType: "Connection Test",
            status: "pending",
            createdAt: Date.now(),
            isTest: true
        };

        const docRef = await addDoc(collection(db, "reservations"), testData);
        console.log("✅ Write Success! Document ID:", docRef.id);

        // 2. Read Test
        console.log("Attempting to read back the test reservation...");
        const q = query(collection(db, "reservations"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log(`✅ Read Success! Found ${querySnapshot.size} document(s).`);
            console.log("Sample Doc Data:", querySnapshot.docs[0].data());
        } else {
            console.log("⚠️ Read successful but no documents found (Collection might be empty or permissions issue).");
        }

        console.log("\n🎉 TEST COMPLETED SUCCESSFULLY");


    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.code, error.message);
        // console.warn("\n[Possible Causes]..."); // Skipping long text
    } finally {
        console.log("Exiting test...");
        process.exit(0);
    }
}

// Global timeout
setTimeout(() => {
    console.error("\n⏳ Test Timed Out (5s). Firebase is likely blocked or not responding.");
    process.exit(1);
}, 5000);

testConnection();

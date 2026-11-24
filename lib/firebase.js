import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// প্রতিটা প্রতিষ্ঠানের নিজস্ব Firebase প্রজেক্ট থাকবে — কনফিগ আসে .env.local থেকে।
// (দেখুন .env.example ও README.md)
// (মান না থাকলে placeholder বসে যাতে build ভেঙে না যায় — কিন্তু অ্যাপ চলবে না, কনসোলে সতর্কতা আসবে)
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'missing-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://missing-default-rtdb.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.error(
    'Firebase কনফিগ পাওয়া যায়নি। .env.example কপি করে .env.local বানিয়ে Firebase এর মান বসান।'
  );
}

// একাধিকবার initialize হওয়া থেকে বাঁচাতে (Next.js hot-reload এর জন্য জরুরি)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;

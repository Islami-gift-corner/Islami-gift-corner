import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase';

// মূল app এর মতোই কনফিগ, কিন্তু আলাদা নামে দ্বিতীয় একটা App ইনস্ট্যান্স।
// কারণ: createUserWithEmailAndPassword() ব্যবহার করলে Firebase Auth স্বয়ংক্রিয়ভাবে
// সেই নতুন ইউজার হিসেবে লগইন করে ফেলে — এতে Admin এর নিজের সেশন হারিয়ে যায়।
// আলাদা "Secondary" App দিয়ে ইউজার তৈরি করলে Admin এর মূল সেশন অক্ষত থাকে।
export function getSecondaryAuth() {
  const secondaryApp = getApps().some((app) => app.name === 'Secondary')
    ? getApp('Secondary')
    : initializeApp(firebaseConfig, 'Secondary');

  return getAuth(secondaryApp);
}

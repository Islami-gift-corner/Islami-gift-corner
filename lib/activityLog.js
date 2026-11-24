import { ref, push, set } from 'firebase/database';
import { database } from './firebase';

/**
 * পুরো অ্যাপে যেকোনো গুরুত্বপূর্ণ কাজ (ইনভয়েস তৈরি, ডিলিট, পেমেন্ট ইত্যাদি)
 * এই একটা ফাংশন দিয়েই লগ করা হবে, যাতে পরে কে কী করেছে তা ট্র্যাক করা যায়।
 *
 * @param {Object} params
 * @param {string} params.userId - যে ইউজার কাজটা করেছে তার UID
 * @param {string} params.action - সংক্ষিপ্ত বিবরণ, যেমন: "ইনভয়েস তৈরি", "কোম্পানি ডিলিট"
 * @param {string} [params.target] - কী নিয়ে কাজ করা হয়েছে, যেমন প্রোডাক্টের নাম/ইনভয়েস নং
 */
export async function logActivity({ userId, action, target = '' }) {
  try {
    const logRef = push(ref(database, 'activity_log'));
    await set(logRef, {
      user_id: userId || 'unknown',
      action,
      target,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // লগ করা ব্যর্থ হলেও মূল কাজ (ইনভয়েস সেভ ইত্যাদি) যেন আটকে না যায়,
    // তাই এখানে এরর ছড়িয়ে দেওয়া হচ্ছে না, শুধু কনসোলে রাখা হচ্ছে।
    console.error('Activity log failed:', err);
  }
}

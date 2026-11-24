import { redirect } from 'next/navigation';

// এই পেজটা যেন কখনো cache না হয়ে যায়, প্রতিবার নতুন করে redirect হয়
export const dynamic = 'force-dynamic';

export default function RootPage() {
  redirect('/splash');
}

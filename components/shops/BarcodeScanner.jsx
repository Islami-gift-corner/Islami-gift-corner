'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { inputCls, btnPrimary } from './ui';

// ফোনের ক্যামেরা দিয়ে বারকোড স্ক্যান। ক্যামেরা চালু থাকে — একের পর এক স্ক্যান করা যায়।
// onDetect(code) একটা ছোট বার্তা (string) ফেরত দিলে সেটা স্ক্যানারের উপরে দেখানো হয়।
export default function BarcodeScanner({ onDetect, onClose }) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState('');
  const scannerRef = useRef(null);
  const lastRef = useRef({ code: '', time: 0 });
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const beep = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(80);
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 120);
    } catch (e) {
      // শব্দ না হলেও সমস্যা নেই
    }
  };

  const handleCode = (code) => {
    const msg = onDetectRef.current(code);
    if (msg) setMessage(msg);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            F.EAN_13,
            F.EAN_8,
            F.UPC_A,
            F.UPC_E,
            F.CODE_128,
            F.CODE_39,
            F.QR_CODE,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 150 } },
          (text) => {
            const now = Date.now();
            // একই কোড বারবার ধরা ঠেকাতে ২ সেকেন্ড অপেক্ষা
            if (lastRef.current.code === text && now - lastRef.current.time < 2000) return;
            lastRef.current = { code: text, time: now };
            beep();
            handleCode(text);
          },
          () => {}
        );
      } catch (err) {
        const name = err?.name || String(err);
        if (/NotAllowed|Permission/i.test(name)) {
          setError('ক্যামেরার অনুমতি দেওয়া হয়নি। ব্রাউজারের সেটিংসে ক্যামেরার অনুমতি দিন, অথবা নিচে কোড লিখে দিন।');
        } else {
          setError('ক্যামেরা চালু করা যায়নি। নিচে কোড লিখে যোগ করুন।');
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, []);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    handleCode(code);
    setManual('');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">বারকোড স্ক্যান করুন</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-sm"
        >
          <X size={16} />
          শেষ করুন
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div id="barcode-reader" className="w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black" />

        {error && (
          <p className="mt-3 text-xs text-white bg-danger/70 rounded-lg px-3 py-2 max-w-md mx-auto">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 text-sm text-white bg-primary/80 rounded-lg px-3 py-2 max-w-md mx-auto text-center">
            {message}
          </p>
        )}

        <form onSubmit={submitManual} className="mt-4 max-w-md mx-auto flex gap-2">
          <div className="relative flex-1">
            <Keyboard
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="বারকোড নম্বর লিখুন"
              className={`${inputCls} pl-9`}
            />
          </div>
          <button type="submit" className={btnPrimary}>
            যোগ
          </button>
        </form>
        <p className="mt-2 text-[11px] text-white/70 text-center">
          স্ক্যান হলে পণ্য আপনা-আপনি তালিকায় যোগ হবে, ক্যামেরা চালু থাকবে
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { barcodeFormat } from '@/lib/shopUtils';

// একটা বারকোডের ছবি (SVG) দেখায়
export default function BarcodeSvg({ code, height = 50, width = 2 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        if (!alive || !svgRef.current) return;
        JsBarcode(svgRef.current, String(code), {
          format: barcodeFormat(code),
          height,
          width,
          fontSize: 13,
          margin: 4,
          displayValue: true,
          background: '#ffffff',
        });
      } catch (e) {
        // অবৈধ কোড হলে ছবি আঁকা হবে না
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, height, width]);

  return <svg ref={svgRef} className="max-w-full rounded bg-white" />;
}

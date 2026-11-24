'use client';

import { useState } from 'react';
import { Calculator, X, Delete } from 'lucide-react';

const OPERATORS = ['+', '-', '×', '÷'];

function safeEvaluate(expr) {
  // ডিসপ্লে চিহ্ন (×, ÷) কে জাভাস্ক্রিপ্টের চিহ্নে বদলানো
  const jsExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${jsExpr})`)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    // ফ্লোটিং পয়েন্টের ছোট ভুল (যেমন 0.1+0.2=0.30000000004) ঠিক করা
    return Math.round(result * 1e10) / 1e10;
  } catch (err) {
    return null;
  }
}

export default function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState('0');
  const [result, setResult] = useState('');
  const [showResult, setShowResult] = useState(false);

  const lastChar = () => expression[expression.length - 1];

  const inputDigit = (digit) => {
    if (showResult) {
      setExpression(String(digit));
      setShowResult(false);
      setResult('');
      return;
    }
    if (expression === '0') {
      setExpression(String(digit));
    } else {
      setExpression(expression + digit);
    }
  };

  const inputDecimal = () => {
    if (showResult) {
      setExpression('0.');
      setShowResult(false);
      setResult('');
      return;
    }
    // বর্তমান সংখ্যার অংশে ইতিমধ্যে দশমিক আছে কিনা যাচাই করা
    const lastNumber = expression.split(/[+\-×÷]/).pop();
    if (!lastNumber.includes('.')) {
      setExpression(expression + (OPERATORS.includes(lastChar()) ? '0.' : '.'));
    }
  };

  const inputOperator = (op) => {
    if (showResult) {
      // আগের ফলাফল থেকেই নতুন হিসাব শুরু হবে
      setExpression(result + op);
      setShowResult(false);
      setResult('');
      return;
    }
    if (expression === '0' && op !== '-') {
      // '-' ছাড়া অন্য অপারেটর দিয়ে শুরু করা যাবে না
      return;
    }
    if (OPERATORS.includes(lastChar())) {
      // পরপর দুইটা অপারেটর চাপলে শেষেরটাই থাকবে
      setExpression(expression.slice(0, -1) + op);
    } else {
      setExpression(expression + op);
    }
  };

  const clearAll = () => {
    setExpression('0');
    setResult('');
    setShowResult(false);
  };

  const backspace = () => {
    if (showResult) {
      clearAll();
      return;
    }
    if (expression.length > 1) {
      setExpression(expression.slice(0, -1));
    } else {
      setExpression('0');
    }
  };

  const handleEquals = () => {
    let expr = expression;
    if (OPERATORS.includes(lastChar())) {
      expr = expr.slice(0, -1); // শেষে অসম্পূর্ণ অপারেটর থাকলে বাদ দেওয়া
    }
    const value = safeEvaluate(expr);
    if (value === null) return;

    setResult(String(value));
    setExpression(expr);
    setShowResult(true);
  };

  // সাধারণ ক্যালকুলেটরের নিয়ম: "100-10%" চাপলে 10% হিসাব হবে 100 এর সাপেক্ষে (=10),
  // তারপর 100-10 = 90। অর্থাৎ শেষ অপারেটরের আগের অংশ (বাম পাশ) মূল্যায়ন করে
  // তার শতাংশ হিসেবে শেষ সংখ্যাটা বদলে দেওয়া হয়।
  const handlePercent = () => {
    if (showResult) {
      const value = parseFloat(result) / 100;
      setResult(String(value));
      setExpression(String(value));
      return;
    }

    // শেষ অপারেটরের অবস্থান খোঁজা (প্রথম ক্যারেক্টার বাদে, যাতে leading '-' ধরা না পড়ে)
    let lastOpIndex = -1;
    for (let i = expression.length - 1; i > 0; i--) {
      if (OPERATORS.includes(expression[i])) {
        lastOpIndex = i;
        break;
      }
    }

    if (lastOpIndex === -1) {
      // কোনো অপারেটর নেই, একটা সংখ্যাই আছে — সরাসরি ১০০ দিয়ে ভাগ, তারপর সাথে সাথে দেখানো
      const current = parseFloat(expression) || 0;
      const value = current / 100;
      setResult(String(value));
      setExpression(String(value));
      setShowResult(true);
      return;
    }

    const leftPart = expression.slice(0, lastOpIndex);
    const rightPart = expression.slice(lastOpIndex + 1);
    if (!rightPart || OPERATORS.includes(rightPart[rightPart.length - 1])) return;

    const leftValue = safeEvaluate(leftPart);
    const rightValue = parseFloat(rightPart);
    if (leftValue === null || isNaN(rightValue)) return;

    const percentValue = (leftValue * rightValue) / 100;
    const newExpr = expression.slice(0, lastOpIndex + 1) + percentValue;

    // % চাপার সাথে সাথেই পুরো হিসাবটা শেষ করে ফলাফল দেখানো (= চাপার মতোই),
    // যাতে বোঝা যায় % বাটনে ক্লিক ঠিকমতো কাজ করেছে
    const finalValue = safeEvaluate(newExpr);
    if (finalValue === null) {
      setExpression(newExpr);
      return;
    }
    setResult(String(finalValue));
    setExpression(newExpr);
    setShowResult(true);
  };

  const buttons = [
    { label: 'C', onClick: clearAll, className: 'text-danger' },
    { label: '%', onClick: handlePercent, className: 'text-primary' },
    { label: <Delete size={16} />, onClick: backspace, className: 'text-text-secondary dark:text-dark-text-secondary' },
    { label: '÷', onClick: () => inputOperator('÷'), className: 'text-primary' },

    { label: '7', onClick: () => inputDigit(7) },
    { label: '8', onClick: () => inputDigit(8) },
    { label: '9', onClick: () => inputDigit(9) },
    { label: '×', onClick: () => inputOperator('×'), className: 'text-primary' },

    { label: '4', onClick: () => inputDigit(4) },
    { label: '5', onClick: () => inputDigit(5) },
    { label: '6', onClick: () => inputDigit(6) },
    { label: '-', onClick: () => inputOperator('-'), className: 'text-primary' },

    { label: '1', onClick: () => inputDigit(1) },
    { label: '2', onClick: () => inputDigit(2) },
    { label: '3', onClick: () => inputDigit(3) },
    { label: '+', onClick: () => inputOperator('+'), className: 'text-primary' },

    { label: '0', onClick: () => inputDigit(0), className: 'col-span-2' },
    { label: '.', onClick: inputDecimal },
    { label: '=', onClick: handleEquals, forceStyle: true },
  ];

  return (
    <>
      {/* ফ্লোটিং বাবল */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="ক্যালকুলেটর খুলুন/বন্ধ করুন"
        className="print:hidden fixed bottom-20 md:bottom-6 right-5 z-40 w-14 h-14 rounded-full
                   flex items-center justify-center
                   bg-white/20 dark:bg-white/10 backdrop-blur-md
                   border border-white/30 shadow-lg
                   hover:scale-105 active:scale-95 transition-transform"
      >
        {open ? (
          <X size={22} className="text-text-primary dark:text-dark-text-primary" />
        ) : (
          <Calculator size={22} className="text-primary" />
        )}
      </button>

      {/* ক্যালকুলেটর প্যানেল */}
      {open && (
        <div
          className="print:hidden fixed bottom-36 md:bottom-24 right-5 z-40 w-64 rounded-2xl overflow-hidden
                     bg-white/30 dark:bg-black/30 backdrop-blur-xl
                     border border-white/30 shadow-2xl"
        >
          {/* ডিসপ্লে */}
          <div className="px-4 py-4 bg-black/10 dark:bg-black/30">
            {/* টাইপ করার সময় শুধু এক লাইনে সম্পূর্ণ হিসাব দেখাবে।
                = চাপার পর উপরে ছোট করে পুরো হিসাব, নিচে বড় করে ফলাফল দেখাবে। */}
            <p className="text-right text-sm text-text-secondary dark:text-dark-text-secondary h-5 truncate">
              {showResult ? expression : '\u00A0'}
            </p>
            <p className="text-right text-2xl font-semibold text-text-primary dark:text-dark-text-primary truncate">
              {showResult ? result : expression}
            </p>
          </div>

          {/* বাটন গ্রিড */}
          <div className="grid grid-cols-4 gap-1.5 p-3">
            {buttons.map((btn, index) => (
              <button
                key={index}
                type="button"
                onClick={btn.onClick}
                className={`rounded-xl py-3 text-sm font-medium
                            active:scale-95 transition-all
                            flex items-center justify-center
                            ${
                              btn.forceStyle
                                ? '!bg-primary !text-white'
                                : `bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20
                                   text-text-primary dark:text-dark-text-primary ${btn.className || ''}`
                            }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
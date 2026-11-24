// ব্যক্তিগত ঋণ (ঋণ গ্রহণ / ঋণ দান) এর লেবেল ও হিসাব
//
// direction:
//   'borrowed' = ঋণ গ্রহণ (আমি কারো কাছ থেকে ঋণ নিয়েছি → আমাকে ফেরত দিতে হবে)
//   'lent'     = ঋণ দান   (আমি কাউকে ঋণ দিয়েছি → আমি ফেরত পাবো)
export const DIRECTIONS = {
  borrowed: {
    title: 'ঋণ গ্রহণ',
    personWord: 'যার কাছ থেকে ঋণ নিয়েছি',
    principalLabel: 'নতুন ঋণ নিলাম',
    repaymentLabel: 'পরিশোধ করলাম',
    totalLabel: 'মোট ঋণ নিয়েছি',
    paidLabel: 'মোট পরিশোধ করেছি',
    remainingLabel: 'বাকি (সে পাবে)',
    pdfPrincipal: 'Borrowed',
    pdfRepayment: 'Repaid',
    pdfRemaining: 'We still owe',
  },
  lent: {
    title: 'ঋণ দান',
    personWord: 'যাকে ঋণ দিয়েছি',
    principalLabel: 'নতুন ঋণ দিলাম',
    repaymentLabel: 'ফেরত পেলাম',
    totalLabel: 'মোট ঋণ দিয়েছি',
    paidLabel: 'মোট ফেরত পেয়েছি',
    remainingLabel: 'বাকি (আমি পাবো)',
    pdfPrincipal: 'Lent',
    pdfRepayment: 'Received back',
    pdfRemaining: 'Still receivable',
  },
};

export function entriesList(person) {
  return Object.entries(person.entries || {})
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || (a.created_at || '').localeCompare(b.created_at || ''));
}

export function summarizeDebt(person) {
  const entries = entriesList(person);
  let total = 0;
  let paid = 0;
  let running = 0;
  const withBalance = entries.map((e) => {
    const amt = Number(e.amount) || 0;
    if (e.type === 'principal') {
      total += amt;
      running += amt;
    } else {
      paid += amt;
      running -= amt;
    }
    return { ...e, balance: running };
  });
  return {
    entries: withBalance,
    total,
    paid,
    remaining: total - paid,
    lastDate: entries.length ? entries[entries.length - 1].date : null,
  };
}

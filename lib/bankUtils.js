import { todayStr } from './format';

// n সংখ্যক কিস্তি পরের তারিখ (সাপ্তাহিক = ৭ দিন, মাসিক = ১ মাস; ৩১ তারিখ হলে ছোট মাসে মাসের শেষ দিন)
export function addPeriod(dateStr, frequency, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  let result;
  if (frequency === 'weekly') {
    result = new Date(y, m - 1, d + 7 * n);
  } else {
    const target = new Date(y, m - 1 + n, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    result = new Date(target.getFullYear(), target.getMonth(), Math.min(d, lastDay));
  }
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(
    result.getDate()
  ).padStart(2, '0')}`;
}

export function paymentsList(loan) {
  return Object.entries(loan.payments || {}).map(([id, p]) => ({ id, ...p }));
}

// লোনের সব কিস্তির তালিকা (তারিখ, পরিমাণ, পরিশোধিত কিনা, বিলম্বিত কিনা)
export function buildSchedule(loan) {
  const payments = paymentsList(loan);
  const byInstallment = {};
  payments.forEach((p) => {
    if (p.installment_no && !byInstallment[p.installment_no]) byInstallment[p.installment_no] = p;
  });
  const today = todayStr();
  const total = Number(loan.total_installments) || 0;
  const rows = [];
  let nextFound = false;
  for (let i = 1; i <= total; i++) {
    const dueDate = addPeriod(loan.first_due_date, loan.frequency, i - 1);
    const payment = byInstallment[i] || null;
    let status = 'upcoming';
    if (payment) status = 'paid';
    else if (dueDate < today) status = 'overdue';
    const isNext = !payment && !nextFound;
    if (isNext) nextFound = true;
    rows.push({
      no: i,
      dueDate,
      amount: Number(loan.installment_amount) || 0,
      payment,
      status,
      isNext,
    });
  }
  return rows;
}

// একটা লোনের সারসংক্ষেপ
export function summarizeLoan(loan) {
  const schedule = buildSchedule(loan);
  const payments = paymentsList(loan);
  const paidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalInstallments = Number(loan.total_installments) || 0;
  const installmentAmount = Number(loan.installment_amount) || 0;
  const totalPayable = installmentAmount * totalInstallments;
  const paidCount = schedule.filter((r) => r.status === 'paid').length;
  const overdue = schedule.filter((r) => r.status === 'overdue');
  const next = schedule.find((r) => r.isNext) || null;
  return {
    schedule,
    paidAmount,
    totalInstallments,
    installmentAmount,
    totalPayable,
    remainingAmount: Math.max(0, totalPayable - paidAmount),
    paidCount,
    remainingCount: totalInstallments - paidCount,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, r) => s + r.amount, 0),
    next,
    interest: totalPayable - (Number(loan.principal) || 0),
    progress: totalPayable > 0 ? Math.min(100, (paidAmount / totalPayable) * 100) : 0,
    finished: totalInstallments > 0 && paidCount >= totalInstallments,
  };
}

// আজ থেকে তারিখ পর্যন্ত কত দিন (ঋণাত্মক = পার হয়ে গেছে)
export function daysFromToday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [ty, tm, td] = todayStr().split('-').map(Number);
  return Math.round((new Date(y, m - 1, d) - new Date(ty, tm - 1, td)) / 86400000);
}

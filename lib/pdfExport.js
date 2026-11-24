/**
 * html2canvas + jsPDF দিয়ে একটা HTML এলিমেন্টের ক্যানভাস ও jsPDF অবজেক্ট তৈরি করে
 * (সেভ/প্রিন্ট দুটোতেই পুনরায় ব্যবহারের জন্য আলাদা করা হয়েছে)।
 *
 * এলিমেন্টের ভেতরে data-pdf-page অ্যাট্রিবিউটওয়ালা একাধিক চাইল্ড থাকলে প্রতিটাকে
 * আলাদা A4 পেজ হিসেবে ধরা হয় (প্রতিটা পেজের নিজস্ব হেডার সহ) — এতে সারি মাঝখানে
 * কাটা পড়ে না। না থাকলে আগের মতো পুরো এলিমেন্ট একটা ছবি হিসেবে নিয়ে প্রয়োজনে ভাগ হয়।
 */
async function buildPdf(element, { thermal = false } = {}) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const renderOptions = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };

  if (thermal) {
    const canvas = await html2canvas(element, renderOptions);
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = 80;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // মাল্টি-পেজ মোড: প্রতিটা data-pdf-page = একটা A4 পেজ
  const pageEls = element.querySelectorAll('[data-pdf-page]');
  if (pageEls.length > 0) {
    for (let i = 0; i < pageEls.length; i++) {
      const canvas = await html2canvas(pageEls[i], renderOptions);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }
    return pdf;
  }

  // সিঙ্গেল-এলিমেন্ট মোড (সবসময় real A4, প্রয়োজনে একাধিক পেজে ভাগ হয়)
  const canvas = await html2canvas(element, renderOptions);
  const imgData = canvas.toDataURL('image/png');

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

/**
 * যেকোনো HTML এলিমেন্টকে A4 সাইজের PDF এ রূপান্তর করে ফোনে/কম্পিউটারে ডাউনলোড করে।
 */
export async function exportElementToPdf(element, filename) {
  const pdf = await buildPdf(element, { thermal: false });
  pdf.save(filename);
}

/**
 * থার্মাল (৩ ইঞ্চি রোল) প্রিন্টের জন্য — কাস্টম সাইজে PDF ডাউনলোড করে।
 */
export async function exportElementToThermalPdf(element, filename) {
  const pdf = await buildPdf(element, { thermal: true });
  pdf.save(filename);
}

/**
 * ব্রাউজারের সরাসরি window.print() ব্যবহার করলে ব্রাউজার নিজে থেকে পেজের
 * উপরে সাইটের নাম/তারিখ আর নিচে ওয়েবসাইট লিংক যোগ করে দেয় (এটা ব্রাউজারের
 * "Headers and footers" সেটিং, কোনো কোড দিয়ে বন্ধ করা যায় না)।
 *
 * এড়ানোর উপায়: প্রথমে এলিমেন্টটাকে PDF এ রূপান্তর করে নতুন ট্যাবে খোলা হয় —
 * PDF ভিউয়ার থেকে প্রিন্ট করলে ব্রাউজারের কোনো হেডার/ফুটার যোগ হয় না, শুধু
 * আসল ইনভয়েসের কনটেন্টই প্রিন্ট হয়।
 */
export async function printElementAsPdf(element, { thermal = false } = {}) {
  // পপআপ ব্লকার এড়াতে ট্যাবটা এখনই (ইউজারের ক্লিকের সাথে সাথেই, কোনো অপেক্ষা
  // ছাড়া) খুলে ফেলা হচ্ছে — PDF বানাতে সময় লাগলে তারপর window.open() কল করলে
  // ব্রাউজার সেটাকে "ইউজারের সরাসরি ক্লিক" হিসেবে আর গণ্য করে না, তাই ব্লক করে দেয়।
  const printWindow = window.open('', '_blank');
  try {
    const pdf = await buildPdf(element, { thermal });
    const blobUrl = pdf.output('bloburl');
    if (printWindow) {
      printWindow.location.href = blobUrl;
    } else {
      throw new Error('popup-blocked');
    }
  } catch (err) {
    if (printWindow) printWindow.close();
    throw err;
  }
}

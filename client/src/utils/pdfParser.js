/**
 * Client-side PDF parser — runs entirely in the browser, no backend needed.
 * Handles common US bank statement formats: Chase, BoA, Wells Fargo,
 * Capital One, Citi, Amex, Discover.
 */
import { detectCategory } from './categoryDetector';
import { isPaymentTransaction } from './paymentDetector';

// ── Date helpers ──────────────────────────────────────────────────────────────
function normalizeDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  // MM/DD/YYYY or MM/DD/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // MM/DD (no year — assume current year)
  if (/^\d{1,2}\/\d{1,2}$/.test(s)) {
    const [m, d] = s.split('/');
    return `${new Date().getFullYear()}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try native parse
  const dt = new Date(s);
  if (!isNaN(dt)) return dt.toISOString().substring(0, 10);
  return null;
}

// ── Text → transactions ───────────────────────────────────────────────────────
function parsePdfText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions = [];
  const dateRe   = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;
  const amountRe = /\$?([\d,]+\.\d{2})/g;
  const negRe    = /\((\d[\d,.]*\.\d{2})\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip obvious header / summary lines
    if (/account|statement|balance|opening|closing|summary|total|page\s*\d|date\s+desc/i.test(line)) continue;

    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;

    // Collect all dollar amounts on this line
    const amounts = [];
    let m;
    const re = /\$?([\d,]+\.\d{2})/g;
    while ((m = re.exec(line)) !== null) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(v) && v > 0) amounts.push(v);
    }
    // Also check for parenthetical negatives (debit)
    const negMatch = line.match(negRe);
    if (negMatch) amounts.push(parseFloat(negMatch[1].replace(/,/g, '')));

    if (!amounts.length) continue;

    // Description = everything except the date and amounts
    const desc = line
      .replace(dateMatch[0], '')
      .replace(/\$?[\d,]+\.\d{2}/g, '')
      .replace(/\([\d,]+\.\d{2}\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (desc.length < 3) continue;

    const amount = amounts[amounts.length - 1];
    if (amount > 50000) continue; // skip balance rows

    const date = normalizeDate(dateMatch[1]);
    if (!date) continue;

    transactions.push({
      id:          `pdf-${i}-${Date.now()}`,
      date,
      description: desc,
      amount,
      category:    detectCategory(desc),
      isPayment:   isPaymentTransaction(desc),
      source:      'pdf',
    });
  }

  return transactions;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function parsePdfClient(file) {
  // Dynamically import pdfjs-dist so it's only loaded when needed
  const pdfjsLib = await import('pdfjs-dist');

  // Use the CDN worker — avoids Vite bundling complexity
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page        = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    // Join items — preserve line breaks using y-position changes
    let prevY = null;
    for (const item of textContent.items) {
      const y = item.transform?.[5];
      if (prevY !== null && Math.abs(y - prevY) > 5) fullText += '\n';
      fullText += item.str + ' ';
      prevY = y;
    }
    fullText += '\n';
  }

  const transactions = parsePdfText(fullText);
  return { transactions, pages: pdf.numPages, count: transactions.length };
}

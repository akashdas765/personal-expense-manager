/**
 * Client-side PDF parser — runs entirely in the browser, no backend needed.
 * Handles common US bank/CC statement formats: Chase, BoA, Wells Fargo,
 * Capital One, Citi, Amex, Discover.
 *
 * Key feature: tracks section headers (PAYMENTS, PURCHASES, FEES…)
 * so transactions in a "Payments" section are correctly tagged isPayment=true.
 */
import { detectCategory } from './categoryDetector';
import { isPaymentTransaction } from './paymentDetector';

// ── Section detection ─────────────────────────────────────────────────────────
// These headers in a PDF indicate we've entered a "payments / credits" section
const PAYMENT_SECTION_RE = /^(payments?\s*(and\s*(other\s*)?credits?)?|credits?\s*(received)?|payment\s*activity|account\s*credits?|other\s*credits?)$/i;

// These headers indicate we've left the payments section (back to purchases/fees)
const EXPENSE_SECTION_RE = /^(purchases?|transactions?|account\s*activity|new\s*charges?|fees?|interest\s*charged|cash\s*advances?|debits?)$/i;

// ── Date helpers ──────────────────────────────────────────────────────────────
function normalizeDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [m, d, y] = s.split('/');
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  if (/^\d{1,2}\/\d{1,2}$/.test(s)) {
    const [m, d] = s.split('/');
    return `${new Date().getFullYear()}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (!isNaN(dt)) return dt.toISOString().substring(0, 10);
  return null;
}

// ── Text → transactions ───────────────────────────────────────────────────────
function parsePdfText(text) {
  const lines        = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions = [];
  const dateRe       = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;
  const negRe        = /\((\d[\d,.]*\.\d{2})\)/;

  let inPaymentSection = false; // tracks current PDF section

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const trimmed = line.trim();

    // ── Section header detection ──────────────────────────────────────────────
    if (PAYMENT_SECTION_RE.test(trimmed)) {
      inPaymentSection = true;
      continue;
    }
    if (EXPENSE_SECTION_RE.test(trimmed)) {
      inPaymentSection = false;
      continue;
    }

    // Skip obvious summary / header lines
    if (/\b(account|statement|balance|opening|closing|summary|total|page\s*\d|date\s+desc)\b/i.test(trimmed)) continue;

    const dateMatch = trimmed.match(dateRe);
    if (!dateMatch) continue;

    // Collect dollar amounts
    const amounts = [];
    let m;
    const re = /\$?([\d,]+\.\d{2})/g;
    while ((m = re.exec(trimmed)) !== null) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(v) && v > 0) amounts.push(v);
    }
    const negMatch = trimmed.match(negRe);
    if (negMatch) amounts.push(parseFloat(negMatch[1].replace(/,/g, '')));
    if (!amounts.length) continue;

    // Description
    const desc = trimmed
      .replace(dateMatch[0], '')
      .replace(/\$?[\d,]+\.\d{2}/g, '')
      .replace(/\([\d,]+\.\d{2}\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (desc.length < 3) continue;

    const amount = amounts[amounts.length - 1];
    if (amount > 50000) continue;

    const date = normalizeDate(dateMatch[1]);
    if (!date) continue;

    // Tag as payment if: in a payment section OR description matches payment patterns
    const isPayment = inPaymentSection || isPaymentTransaction(desc);

    transactions.push({
      id:          `pdf-${i}-${Date.now()}`,
      date,
      description: desc,
      amount,
      category:    isPayment ? 'Payment' : detectCategory(desc),
      isPayment,
      source:      'pdf',
    });
  }

  return transactions;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function parsePdfClient(file) {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page        = await pdf.getPage(p);
    const textContent = await page.getTextContent();
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
  const expenses     = transactions.filter(t => !t.isPayment);
  const payments     = transactions.filter(t =>  t.isPayment);

  return {
    transactions,
    expenses,
    payments,
    pages: pdf.numPages,
    count: transactions.length,
  };
}

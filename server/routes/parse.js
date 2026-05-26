const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── PDF Bank Statement Parser ────────────────────────────────────────────────
// Handles common US bank formats: Chase, BoA, Wells Fargo, Capital One, Citi, Amex

function parsePdfText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions = [];

  // Regex patterns for dates and amounts
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,   // MM/DD/YYYY or MM/DD/YY
    /\b(\d{1,2}\/\d{1,2})\b/,             // MM/DD (no year)
    /\b(\d{4}-\d{2}-\d{2})\b/,            // YYYY-MM-DD
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}\b/i,
  ];

  const amountPattern = /[-+]?\$?([\d,]+\.\d{2})\s*(-)?/g;
  const negAmountPattern = /\((\d{1,3}(?:,\d{3})*\.\d{2})\)/; // (123.45) = negative

  // Look for transaction-like lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header/footer lines
    if (/account|statement|balance|opening|closing|summary|total|page|date\s+description/i.test(line)) continue;

    let date = null;
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) { date = match[0]; break; }
    }

    if (!date) continue;

    // Extract amount – look for debit amounts (positive spending)
    const amounts = [];
    let m;
    const amtRegex = /\$?([\d,]+\.\d{2})/g;
    while ((m = amtRegex.exec(line)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amounts.push(val);
    }

    // Parenthetical negatives
    const negMatch = line.match(negAmountPattern);
    if (negMatch) amounts.push(parseFloat(negMatch[1].replace(/,/g, '')));

    if (amounts.length === 0) continue;

    // Description = everything between date and first amount
    let desc = line
      .replace(date, '')
      .replace(amtRegex, '')
      .replace(negAmountPattern, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Skip very short descriptions (likely noise)
    if (desc.length < 3) continue;

    // Use the last amount as the transaction amount (common in multi-column statements)
    const amount = amounts[amounts.length - 1];

    // Skip likely-balance rows (very large amounts)
    if (amount > 50000) continue;

    transactions.push({
      id: `pdf-${Date.now()}-${i}`,
      date: normalizeDate(date),
      description: desc,
      amount,
      source: 'pdf',
    });
  }

  return transactions;
}

function normalizeDate(raw) {
  try {
    // Handle MM/DD or MM/DD/YY formats
    if (/^\d{1,2}\/\d{1,2}$/.test(raw)) {
      const [m, d] = raw.split('/');
      return `${new Date().getFullYear()}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(raw)) {
      const [m, d, y] = raw.split('/');
      return `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
      const [m, d, y] = raw.split('/');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // Month name formats
    const d = new Date(raw);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return raw;
  } catch {
    return raw;
  }
}

// POST /api/parse/pdf
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const data = await pdfParse(req.file.buffer);
    const transactions = parsePdfText(data.text);

    res.json({
      transactions,
      raw_text: data.text.substring(0, 2000), // first 2000 chars for debugging
      pages: data.numpages,
      count: transactions.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parse/test  — test with raw text
router.post('/test', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  try {
    const transactions = parsePdfText(req.body);
    res.json({ transactions, count: transactions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

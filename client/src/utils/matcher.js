/**
 * Smart matching engine:
 * - Compares bank transactions against Splitwise expenses
 * - Matched → use myOwedShare (your split)
 * - Unmatched → use full bank amount (entirely your expense)
 */

import { detectCategory } from './categoryDetector';
import { parseDate } from './formatters';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DATE_DIFF_DAYS = 5;
const MAX_AMOUNT_DIFF_PCT = 0.05; // 5% tolerance for tips/fees

function daysDiff(d1, d2) {
  const t1 = d1 instanceof Date ? d1.getTime() : new Date(d1).getTime();
  const t2 = d2 instanceof Date ? d2.getTime() : new Date(d2).getTime();
  return Math.abs(t1 - t2) / DAY_MS;
}

function fuzzyDescScore(a, b) {
  if (!a || !b) return 0;
  const tokenize = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const tokA = new Set(tokenize(a));
  const tokB = new Set(tokenize(b));
  let common = 0;
  for (const t of tokA) if (tokB.has(t)) common++;
  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : common / union; // Jaccard similarity
}

export function matchTransactions(bankTransactions, splitwiseExpenses) {
  const usedExpenses = new Set();
  const result = [];

  for (const txn of bankTransactions) {
    const txnDate   = parseDate(txn.date) || new Date();
    const txnAmount = Math.abs(txn.amount || 0);

    let bestMatch = null;
    let bestScore = 0;

    for (const exp of splitwiseExpenses) {
      if (usedExpenses.has(exp.id)) continue;

      const expDate   = parseDate(exp.date) || new Date();
      const expAmount = parseFloat(exp.cost || 0);

      // Date gate
      const dDiff = daysDiff(txnDate, expDate);
      if (dDiff > MAX_DATE_DIFF_DAYS) continue;

      // Amount gate — must be within 5% (to allow for tips/fees)
      const larger  = Math.max(txnAmount, expAmount);
      const smaller = Math.min(txnAmount, expAmount);
      if (larger === 0) continue;
      const amtRatio = smaller / larger;
      if (amtRatio < (1 - MAX_AMOUNT_DIFF_PCT)) continue;

      // Score
      const dateScore   = (MAX_DATE_DIFF_DAYS - dDiff) / MAX_DATE_DIFF_DAYS; // 0-1
      const amountScore = amtRatio;                                            // 0-1
      const descScore   = fuzzyDescScore(txn.description, exp.description);   // 0-1

      const total = dateScore * 0.25 + amountScore * 0.55 + descScore * 0.20;

      if (total > bestScore) {
        bestScore = total;
        bestMatch = exp;
      }
    }

    // Require a minimum confidence (amount must be close enough)
    const THRESHOLD = 0.45;

    if (bestMatch && bestScore >= THRESHOLD) {
      usedExpenses.add(bestMatch.id);
      result.push({
        ...txn,
        isSplitwised:    true,
        splitwiseId:     bestMatch.id,
        splitwiseDesc:   bestMatch.description,
        matchScore:      Math.round(bestScore * 100),
        originalAmount:  txnAmount,
        effectiveAmount: bestMatch.myOwedShare,
        savings:         txnAmount - bestMatch.myOwedShare,
        category:        txn.category || detectCategory(txn.description) || bestMatch.category,
        groupId:         bestMatch.group_id,
      });
    } else {
      result.push({
        ...txn,
        isSplitwised:    false,
        splitwiseId:     null,
        originalAmount:  txnAmount,
        effectiveAmount: txnAmount,
        savings:         0,
        category:        txn.category || detectCategory(txn.description),
      });
    }
  }

  // Also add Splitwise-only expenses (not in bank statements — e.g. cash)
  for (const exp of splitwiseExpenses) {
    if (!usedExpenses.has(exp.id) && exp.myOwedShare > 0) {
      result.push({
        id:              `sw-only-${exp.id}`,
        date:            exp.date,
        description:     exp.description,
        amount:          exp.cost,
        isSplitwised:    true,
        isSplitOnly:     true,  // present in Splitwise but not in bank upload
        splitwiseId:     exp.id,
        originalAmount:  exp.cost,
        effectiveAmount: exp.myOwedShare,
        savings:         exp.cost - exp.myOwedShare,
        category:        detectCategory(exp.description) || exp.category,
        groupId:         exp.group_id,
        source:          'splitwise',
      });
    }
  }

  return result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function computeSummary(transactions) {
  let totalOriginal   = 0;
  let totalEffective  = 0;
  let totalSavings    = 0;
  let splitCount      = 0;
  let personalCount   = 0;

  for (const t of transactions) {
    if (t.isSplitOnly) continue; // not a bank debit
    totalOriginal  += t.originalAmount  || 0;
    totalEffective += t.effectiveAmount || 0;
    totalSavings   += t.savings         || 0;
    if (t.isSplitwised) splitCount++;
    else personalCount++;
  }

  return { totalOriginal, totalEffective, totalSavings, splitCount, personalCount };
}

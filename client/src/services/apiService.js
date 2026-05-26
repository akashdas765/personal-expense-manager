import axios from 'axios';

const BASE = '/api';

function splitwiseHeaders(apiKey) {
  return apiKey ? { 'x-splitwise-key': apiKey } : {};
}

// ── Splitwise ─────────────────────────────────────────────────────────────────
export async function fetchSplitwiseUser(apiKey) {
  const { data } = await axios.get(`${BASE}/splitwise/user`, {
    headers: splitwiseHeaders(apiKey),
  });
  return data.user;
}

export async function fetchSplitwiseGroups(apiKey) {
  const { data } = await axios.get(`${BASE}/splitwise/groups`, {
    headers: splitwiseHeaders(apiKey),
  });
  return data.groups || [];
}

export async function fetchSplitwiseExpenses(apiKey, { datedAfter, datedBefore, groupId } = {}) {
  const params = {};
  if (datedAfter)  params.dated_after  = datedAfter;
  if (datedBefore) params.dated_before = datedBefore;
  if (groupId)     params.group_id     = groupId;

  const { data } = await axios.get(`${BASE}/splitwise/expenses`, {
    headers: splitwiseHeaders(apiKey),
    params,
  });
  return { expenses: data.expenses || [], currentUserId: data.currentUserId };
}

// ── PDF Parse ─────────────────────────────────────────────────────────────────
export async function parsePdfStatement(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post(`${BASE}/parse/pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { transactions, count, pages }
}

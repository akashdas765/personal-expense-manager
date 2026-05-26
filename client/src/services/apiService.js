import axios from 'axios';

// In production (Netlify) → serverless functions
// In development        → Express proxy via Vite
const isProd   = import.meta.env.PROD;
const SW_BASE  = isProd ? '/.netlify/functions' : '/api/splitwise';
const API_BASE = '/api';

// Hardcoded key — used as fallback if none passed
export const DEFAULT_API_KEY = 'xucT3KflcCOkmuVlP4UtkSEvONRHVyclBoT6bLFM';

function swHeaders(apiKey) {
  // Only needed for the Express dev proxy (Netlify functions have the key baked in)
  return isProd ? {} : { 'x-splitwise-key': apiKey || DEFAULT_API_KEY };
}

// ── Splitwise ─────────────────────────────────────────────────────────────────

export async function fetchSplitwiseUser(apiKey) {
  const url = isProd ? `${SW_BASE}/sw-user` : `${SW_BASE}/user`;
  const { data } = await axios.get(url, { headers: swHeaders(apiKey) });
  return data.user;
}

export async function fetchSplitwiseGroups(apiKey) {
  const url = isProd ? `${SW_BASE}/sw-groups` : `${SW_BASE}/groups`;
  const { data } = await axios.get(url, { headers: swHeaders(apiKey) });
  return data.groups || [];
}

export async function fetchSplitwiseExpenses(apiKey, { datedAfter, datedBefore, groupId } = {}) {
  const url = isProd ? `${SW_BASE}/sw-expenses` : `${SW_BASE}/expenses`;
  const params = {};
  if (datedAfter)  params.dated_after  = datedAfter;
  if (datedBefore) params.dated_before = datedBefore;
  if (groupId)     params.group_id     = groupId;

  const { data } = await axios.get(url, { headers: swHeaders(apiKey), params });
  return {
    expenses:         data.expenses         || [],
    currentUserId:    data.currentUserId,
    paymentsReceived: data.paymentsReceived || [],
  };
}

// ── PDF Parse ─────────────────────────────────────────────────────────────────

export async function parsePdfStatement(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post(`${API_BASE}/parse/pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

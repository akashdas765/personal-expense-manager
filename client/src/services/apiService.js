import axios from 'axios';

// In production → call Splitwise directly (their API supports CORS)
// In development → Express proxy via Vite (avoids CORS in local dev)
const isProd        = import.meta.env.PROD;
const SW_DIRECT     = 'https://secure.splitwise.com/api/v3.0';
const SW_DEV_BASE   = '/api/splitwise';
const API_BASE      = '/api';

export const DEFAULT_API_KEY = '';

function swAuthHeader(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}

function swProxyHeader(apiKey) {
  return { 'x-splitwise-key': apiKey };
}

// ── Splitwise ─────────────────────────────────────────────────────────────────

export async function fetchSplitwiseUser(apiKey) {
  if (!apiKey) throw new Error('No API key provided');
  if (isProd) {
    const { data } = await axios.get(`${SW_DIRECT}/get_current_user`, {
      headers: swAuthHeader(apiKey),
    });
    if (!data.user) throw new Error(data.error || 'Connection failed');
    return data.user;
  }
  const { data } = await axios.get(`${SW_DEV_BASE}/user`, { headers: swProxyHeader(apiKey) });
  if (!data.user) throw new Error(data.error || 'Connection failed');
  return data.user;
}

export async function fetchSplitwiseGroups(apiKey) {
  if (isProd) {
    const { data } = await axios.get(`${SW_DIRECT}/get_groups`, {
      headers: swAuthHeader(apiKey),
    });
    return data.groups || [];
  }
  const { data } = await axios.get(`${SW_DEV_BASE}/groups`, { headers: swProxyHeader(apiKey) });
  return data.groups || [];
}

export async function fetchSplitwiseExpenses(apiKey, { datedAfter, datedBefore, groupId } = {}) {
  const params = {};
  if (datedAfter)  params.dated_after  = datedAfter;
  if (datedBefore) params.dated_before = datedBefore;
  if (groupId)     params.group_id     = groupId;
  params.limit  = 500;
  params.offset = 0;

  if (isProd) {
    // Fetch user + expenses in parallel directly from Splitwise
    const headers = swAuthHeader(apiKey);
    const [userResp, expResp] = await Promise.all([
      axios.get(`${SW_DIRECT}/get_current_user`, { headers }),
      axios.get(`${SW_DIRECT}/get_expenses`, { headers, params }),
    ]);
    const currentUserId = userResp.data.user?.id;
    return _processExpenses(expResp.data.expenses || [], currentUserId);
  }

  const { data } = await axios.get(`${SW_DEV_BASE}/expenses`, {
    headers: swProxyHeader(apiKey),
    params,
  });
  return {
    expenses:         data.expenses         || [],
    currentUserId:    data.currentUserId,
    paymentsReceived: data.paymentsReceived || [],
  };
}

function _processExpenses(allExpenses, currentUserId) {
  const SKIP_DESC = /settle|settlement|reimburs|payback|pay back|paid back/i;

  const expenses = allExpenses
    .filter(e => !e.deleted_at && !e.payment && !SKIP_DESC.test(e.description || ''))
    .map(e => {
      const userShare = (e.users || []).find(u => u.user_id === currentUserId);
      return {
        id:            e.id,
        description:   e.description,
        cost:          parseFloat(e.cost),
        currency_code: e.currency_code,
        date:          e.date,
        group_id:      e.group_id,
        category:      e.category?.name || 'Other',
        created_by:    e.created_by?.first_name,
        myPaidShare:   parseFloat(userShare?.paid_share  || 0),
        myOwedShare:   parseFloat(userShare?.owed_share  || 0),
        myNetBalance:  parseFloat(userShare?.net_balance || 0),
      };
    });

  const paymentsReceived = allExpenses
    .filter(e => !e.deleted_at && e.payment === true)
    .flatMap(e => {
      const userShare = (e.users || []).find(u => u.user_id === currentUserId);
      const received  = parseFloat(userShare?.owed_share || 0);
      if (received <= 0) return [];
      const payer = (e.users || []).find(u => parseFloat(u.paid_share || 0) > 0);
      return [{
        id:          e.id,
        description: e.description || 'Payment',
        amount:      received,
        date:        e.date,
        paidBy:      payer?.user?.first_name || e.created_by?.first_name || 'Someone',
        group_id:    e.group_id,
      }];
    });

  return { expenses, currentUserId, paymentsReceived };
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

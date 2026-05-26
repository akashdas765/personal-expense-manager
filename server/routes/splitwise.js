const express = require('express');
const axios = require('axios');
const router = express.Router();

const SPLITWISE_BASE = 'https://secure.splitwise.com/api/v3.0';

function getHeaders(apiKey) {
  if (!apiKey) throw new Error('No Splitwise API key provided');
  return { Authorization: `Bearer ${apiKey}` };
}

// GET /api/splitwise/user
router.get('/user', async (req, res) => {
  try {
    const apiKey = req.headers['x-splitwise-key'] || process.env.SPLITWISE_API_KEY;
    const { data } = await axios.get(`${SPLITWISE_BASE}/get_current_user`, {
      headers: getHeaders(apiKey),
    });
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.error || err.message,
    });
  }
});

// GET /api/splitwise/groups
router.get('/groups', async (req, res) => {
  try {
    const apiKey = req.headers['x-splitwise-key'] || process.env.SPLITWISE_API_KEY;
    const { data } = await axios.get(`${SPLITWISE_BASE}/get_groups`, {
      headers: getHeaders(apiKey),
    });
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.error || err.message,
    });
  }
});

// GET /api/splitwise/expenses?dated_after=YYYY-MM-DD&dated_before=YYYY-MM-DD&group_id=...
router.get('/expenses', async (req, res) => {
  try {
    const apiKey = req.headers['x-splitwise-key'] || process.env.SPLITWISE_API_KEY;
    const params = {};
    if (req.query.dated_after)  params.dated_after  = req.query.dated_after;
    if (req.query.dated_before) params.dated_before = req.query.dated_before;
    if (req.query.group_id)     params.group_id     = req.query.group_id;
    params.limit  = req.query.limit  || 500;
    params.offset = req.query.offset || 0;

    const { data } = await axios.get(`${SPLITWISE_BASE}/get_expenses`, {
      headers: getHeaders(apiKey),
      params,
    });

    // Flatten: attach each expense with current user's owed_share
    const currentUserResp = await axios.get(`${SPLITWISE_BASE}/get_current_user`, {
      headers: getHeaders(apiKey),
    });
    const currentUserId = currentUserResp.data.user.id;

    const SKIP_DESC = /settle|settlement|reimburs|payback|pay back|paid back/i;

    const enriched = (data.expenses || [])
      .filter(e => !e.deleted_at && !e.payment && !SKIP_DESC.test(e.description || ''))
      .map(e => {
        const userShare = (e.users || []).find(u => u.user_id === currentUserId);
        return {
          id: e.id,
          description: e.description,
          cost: parseFloat(e.cost),
          currency_code: e.currency_code,
          date: e.date,
          group_id: e.group_id,
          category: e.category?.name || 'Other',
          created_by: e.created_by?.first_name,
          myPaidShare: parseFloat(userShare?.paid_share || 0),
          myOwedShare: parseFloat(userShare?.owed_share || 0),
          myNetBalance: parseFloat(userShare?.net_balance || 0),
        };
      });

    const paymentsReceived = (data.expenses || [])
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

    res.json({ expenses: enriched, currentUserId, paymentsReceived });
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.error || err.message,
    });
  }
});
module.exports = router;

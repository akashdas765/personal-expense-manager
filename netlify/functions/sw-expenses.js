const API_KEY = 'xucT3KflcCOkmuVlP4UtkSEvONRHVyclBoT6bLFM';
const BASE    = 'https://secure.splitwise.com/api/v3.0';
const HEADERS = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  try {
    const p = event.queryStringParameters || {};

    // Fetch current user to identify their shares
    const userRes  = await fetch(`${BASE}/get_current_user`, { headers: HEADERS });
    const userData = await userRes.json();
    const currentUserId = userData.user?.id;

    // Build expenses URL with optional filters
    const url = new URL(`${BASE}/get_expenses`);
    if (p.dated_after)  url.searchParams.set('dated_after',  p.dated_after);
    if (p.dated_before) url.searchParams.set('dated_before', p.dated_before);
    if (p.group_id)     url.searchParams.set('group_id',     p.group_id);
    url.searchParams.set('limit',  p.limit  || '500');
    url.searchParams.set('offset', p.offset || '0');

    const expRes  = await fetch(url.toString(), { headers: HEADERS });
    const expData = await expRes.json();

    const SKIP_DESC = /settle|settlement|reimburs|payback|pay back|paid back/i;
    const allExpenses = expData.expenses || [];

    // Regular expenses (not payments, not settlements)
    const enriched = allExpenses
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

    // Payments RECEIVED by current user
    // In Splitwise: when someone pays you, your owed_share > 0 on a payment expense
    const paymentsReceived = allExpenses
      .filter(e => !e.deleted_at && e.payment === true)
      .flatMap(e => {
        const userShare = (e.users || []).find(u => u.user_id === currentUserId);
        const received  = parseFloat(userShare?.owed_share || 0);
        if (received <= 0) return [];
        // Find who paid (paidShare > 0)
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ expenses: enriched, currentUserId, paymentsReceived }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

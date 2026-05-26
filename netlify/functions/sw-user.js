const API_KEY = 'xucT3KflcCOkmuVlP4UtkSEvONRHVyclBoT6bLFM';
const BASE    = 'https://secure.splitwise.com/api/v3.0';

exports.handler = async () => {
  try {
    const res  = await fetch(`${BASE}/get_current_user`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

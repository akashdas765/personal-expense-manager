const API_KEY = 'xucT3KflcCOkmuVlP4UtkSEvONRHVyclBoT6bLFM';
const BASE    = 'https://secure.splitwise.com/api/v3.0';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-splitwise-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  try {
    const res  = await fetch(`${BASE}/get_groups`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

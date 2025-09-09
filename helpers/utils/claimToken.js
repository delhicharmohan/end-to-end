const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function base64urlDecode(input) {
  input = input.replace(/-/g,'+').replace(/_/g,'/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString();
}

function getSecret() {
  return process.env.CLAIM_TOKEN_SECRET || process.env.JWT_SECRET || 'change-me-dev-secret';
}

function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64')
    .replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}

function verify(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64')
    .replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  if (expected !== s) throw new Error('Invalid signature');
  const payload = JSON.parse(base64urlDecode(p));
  // expiry check
  const nowSec = Math.floor(Date.now()/1000);
  if (payload.iat && payload.ttl && (payload.iat + payload.ttl) < nowSec) {
    throw new Error('Token expired');
  }
  return payload;
}

module.exports = { sign, verify };

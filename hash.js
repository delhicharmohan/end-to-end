// save as hash.js and run: node hash.js
const crypto = require('crypto');

function makeHash(secret, bodyObj) {
  const s = JSON.stringify(bodyObj);
  return crypto.createHmac('sha256', secret).update(s).digest('base64');
}

// EXAMPLE USAGE:
const secret = 's23e4567e89b12d3a45642661417400s';
const body = {};
console.log(makeHash(secret, body));
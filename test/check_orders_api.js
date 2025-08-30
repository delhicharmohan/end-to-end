const http = require('http');

// Simple API call to check order states
const postData = JSON.stringify({
  payoutRefId: 'payout-ffa0b72c-170e-48bf-8877-be76c8f9816c',
  payinIds: [14601, 14600]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/remaining-amount/check/debug', // We'll create this endpoint
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer YOUR_TOKEN_HERE' // You'll need to get a valid token
  }
};

console.log('Making API call to check order states...');
console.log('If this fails, we need to check the database manually or create the debug endpoint.');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Order States:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('API call failed:', error.message);
  console.log('');
  console.log('Alternative: Check the server console logs for partial matching attempts');
  console.log('Or use the database queries from debug_partial_matching.js');
});

req.write(postData);
req.end();

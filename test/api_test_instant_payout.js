const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testInstantPayoutAPI() {
  console.log('🧪 === API TEST: INSTANT PAYOUT FLOW ===\n');

  try {
    // Step 1: Create a payout order
    console.log('📝 Step 1: Creating payout order...');
    
    const payoutData = {
      type: 'payout',
      payoutType: 'instant',
      amount: 100,
      accountNumber: '1234567890',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India'
    };

    const payoutResponse = await axios.post(`${API_BASE}/testvendor/orders`, payoutData);
    
    if (payoutResponse.data.success) {
      console.log('✅ Payout order created:', payoutResponse.data.data.refID);
      console.log('🔗 Instant Payout URL:', payoutResponse.data.data.instantPayoutURL);
      
      // Step 2: Create a payin order that should match
      console.log('\n📝 Step 2: Creating payin order (should match)...');
      
      const payinData = {
        type: 'payin',
        amount: 50, // Partial amount
        customerUPIID: '9876543210@paytm',
        customerMobile: '9876543210'
      };

      const payinResponse = await axios.post(`${API_BASE}/orders`, payinData, {
        headers: {
          'vendor': 'testvendor'
        }
      });

      if (payinResponse.data.success) {
        console.log('✅ Payin order created:', payinResponse.data.data.refID);
        
        if (payinResponse.data.data.redirectURL) {
          console.log('🎯 MATCHED! Redirect URL:', payinResponse.data.data.redirectURL);
        } else {
          console.log('❌ NOT MATCHED - No redirect URL provided');
        }
      } else {
        console.log('❌ Payin creation failed:', payinResponse.data.message);
      }
    } else {
      console.log('❌ Payout creation failed:', payoutResponse.data.message);
    }

  } catch (error) {
    console.error('💥 API Error:', error.response?.data || error.message);
  }
}

// Add a delay to ensure backend is ready
setTimeout(() => {
  testInstantPayoutAPI();
}, 3000);


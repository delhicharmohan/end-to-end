# WizPay End-to-End Pay - Postman Collection Guide

## Overview

This guide explains how to use the WizPay End-to-End Pay Postman collection for vendor integration. The collection includes all necessary endpoints for order creation, instant payout marketplace, and batch processing.

## Files Included

1. **WizPay-End-to-End-Pay-Vendor-Collection.postman_collection.json** - Main collection file
2. **WizPay-End-to-End-Pay-Environment.postman_environment.json** - Environment variables
3. **Postman-Collection-Guide.md** - This documentation

## Quick Setup

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `WizPay-End-to-End-Pay-Vendor-Collection.postman_collection.json`
   - `WizPay-End-to-End-Pay-Environment.postman_environment.json`

### 2. Configure Environment Variables

1. Select the **WizPay End-to-End Pay - Environment** from the environment dropdown
2. Click the **eye icon** to edit environment variables
3. Update the following values:

```json
{
  "base_url": "https://your-domain.com/api/v1",  // Your API base URL
  "api_key": "your-actual-api-key",              // Your vendor API key
  "api_secret": "your-actual-api-secret",        // Your vendor API secret
  "vendor_id": "your-vendor-id",                 // Your vendor identifier
  "admin_username": "your-admin-username",       // Admin username
  "admin_password": "your-admin-password"        // Admin password
}
```

### 3. Test Authentication

1. Go to **Authentication > Admin Login**
2. Click **Send**
3. Verify you receive a JWT token in the response
4. The token will be automatically stored in the environment

## Collection Structure

### 1. Order Management
- **Create Payin Order** - Create new payin orders
- **Create Payout Order** - Create new payout orders
- **Get Order Status** - Check order status
- **List Orders** - List orders with pagination

### 2. Instant Payout Marketplace
- **List Available Instant Payouts** - Browse available payouts
- **Create Payin Against Specific Payout** - Cross-vendor matching
- **Claim Instant Payout** - Claim payout for processing

### 3. Payin-Payout Matching
- **Complete Payin Matching** - Complete matching process
- **Process Pending Payin Matching** - Batch process pending matches
- **Get Payin Matching Status** - Check matching status

### 4. Instant Payout Batch Processing
- **Complete Instant Payout Batch** - Complete batch processing
- **Process All Pending Instant Payouts** - Batch process all pending
- **Get Instant Payout Status** - Check batch status

### 5. Communication
- **Get Instant Payout Chat** - Retrieve chat messages
- **Send Chat Message** - Send chat messages

### 6. Debug & Monitoring
- **Debug Available Payouts** - Debug matching issues
- **Instant Payout Health Check** - System health monitoring

### 7. Authentication
- **Admin Login** - Get JWT token for admin operations

## Usage Examples

### Example 1: Complete End-to-End Flow

1. **Create Payout Order**
   ```
   POST /orders
   Body: {
     "type": "payout",
     "payoutType": "instant",
     "amount": 1000,
     "accountNumber": "1234567890",
     "ifsc": "SBIN0001234",
     "bankName": "State Bank of India"
   }
   ```

2. **Create Payin Order** (should match automatically)
   ```
   POST /orders
   Body: {
     "type": "payin",
     "amount": 500,
     "customerMobile": "9876543210",
     "customerUPIID": "customer@paytm"
   }
   ```

3. **Check Order Status**
   ```
   GET /orders/{refID}
   ```

4. **Complete Matching** (when payment confirmed)
   ```
   POST /payin-matching/complete/{payinOrderId}
   Body: {
     "transactionId": "TXN123456789",
     "confirmedBy": "admin"
   }
   ```

### Example 2: Cross-Vendor Instant Payout

1. **List Available Payouts**
   ```
   GET /orders/instant-payout/available?minAmount=100&maxAmount=1000
   ```

2. **Create Payin Against Specific Payout**
   ```
   POST /orders/instant-payout/{payoutRefID}/create-payin
   Headers: {
     "vendor": "your-vendor-id"
   }
   Body: {
     "amount": 500,
     "customerUPIID": "customer@paytm",
     "customerMobile": "9876543210"
   }
   ```

### Example 3: Batch Processing

1. **Process Pending Matches**
   ```
   POST /payin-matching/process-pending
   ```

2. **Check Status**
   ```
   GET /payin-matching/status
   ```

## Authentication Methods

### 1. Vendor Authentication (x-key + x-hash)

Used for order creation and marketplace operations:

- **x-key**: Your vendor API key
- **x-hash**: HMAC SHA256 hash of request body using your secret

The collection automatically generates the hash using the `api_secret` environment variable.

### 2. Admin Authentication (JWT Cookie)

Used for order approval and management:

1. Call **Admin Login** endpoint
2. JWT token is automatically stored in environment
3. Token is used in subsequent admin requests

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `https://api.wizpay.com/v1` |
| `api_key` | Vendor API key | `vendor_12345` |
| `api_secret` | Vendor API secret | `secret_67890` |
| `vendor_id` | Vendor identifier | `vendor1` |
| `admin_username` | Admin username | `admin` |
| `admin_password` | Admin password | `password123` |
| `jwt_token` | JWT token (auto-populated) | `eyJhbGciOiJIUzI1NiIs...` |
| `LAST_REF_ID` | Last order ref ID (auto-populated) | `f8cd2375-98d0-479f-9e3c-b4f2e0de14ed` |
| `PAYOUT_REF_ID` | Payout ref ID for testing | `payout-ref-123` |
| `PAYIN_ORDER_ID` | Payin order ID for batch processing | `123` |

## Test Scripts

The collection includes automated test scripts that:

1. **Validate Response Time** - Ensures responses are under 5 seconds
2. **Check Success Field** - Validates response structure
3. **Store Reference IDs** - Automatically stores ref IDs for subsequent requests
4. **Validate Specific Fields** - Checks for required response fields

### Example Test Script

```javascript
pm.test('Payin order created successfully', function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property('refID');
});

pm.test('Response contains redirect URL if matched', function () {
    const jsonData = pm.response.json();
    if (jsonData.data.matched) {
        pm.expect(jsonData.data).to.have.property('redirectURL');
    }
});
```

## Pre-request Scripts

The collection includes pre-request scripts that:

1. **Auto-generate HMAC Hash** - Automatically creates hash for requests that need it
2. **Set Dynamic Values** - Uses timestamps for idempotency keys

### Example Pre-request Script

```javascript
// Auto-generate HMAC hash for requests that need it
if (pm.request.headers.has('x-hash')) {
    const crypto = require('crypto-js');
    const secret = pm.environment.get('API_SECRET');
    const body = pm.request.body ? pm.request.body.raw : '';
    
    if (secret && body) {
        const hash = crypto.HmacSHA256(body, secret).toString(crypto.enc.Base64);
        pm.request.headers.upsert({
            key: 'x-hash',
            value: hash,
            disabled: false
        });
    }
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Problem**: Getting 401 Unauthorized errors

**Solutions**:
- Verify `api_key` and `api_secret` are correct
- Check that `base_url` is properly set
- Ensure environment is selected

#### 2. Hash Generation Issues

**Problem**: HMAC hash not being generated

**Solutions**:
- Verify `api_secret` is set in environment
- Check that request body is properly formatted
- Ensure pre-request script is enabled

#### 3. Environment Variables Not Working

**Problem**: Variables not being substituted

**Solutions**:
- Ensure environment is selected in Postman
- Check variable names match exactly
- Verify variables are enabled

#### 4. Test Scripts Failing

**Problem**: Tests are failing

**Solutions**:
- Check response structure matches expected format
- Verify API is returning expected data
- Review test script logic

### Debug Steps

1. **Check Environment Variables**
   ```
   Click the eye icon next to environment dropdown
   Verify all variables are set correctly
   ```

2. **Test Authentication**
   ```
   Run "Admin Login" request
   Verify JWT token is received and stored
   ```

3. **Test Basic Order Creation**
   ```
   Run "Create Payin Order" request
   Check response for success and refID
   ```

4. **Use Debug Endpoints**
   ```
   Run "Debug Available Payouts" request
   Check system status and available data
   ```

## Best Practices

### 1. Environment Management

- Use separate environments for development, staging, and production
- Keep sensitive data (API keys, secrets) in environment variables
- Regularly rotate API keys and secrets

### 2. Request Organization

- Use folders to organize requests by functionality
- Add descriptions to requests for clarity
- Use meaningful request names

### 3. Testing

- Run tests after each request to validate responses
- Use collection runner for automated testing
- Monitor test results for API changes

### 4. Error Handling

- Check response status codes
- Validate error message formats
- Handle different error scenarios

## Collection Runner

Use the Collection Runner for automated testing:

1. Click **Collection Runner** in Postman
2. Select the **WizPay End-to-End Pay - Vendor Integration** collection
3. Select the environment
4. Configure iterations and delays
5. Run the collection

### Example Runner Configuration

```json
{
  "collection": "WizPay End-to-End Pay - Vendor Integration",
  "environment": "WizPay End-to-End Pay - Environment",
  "iterations": 1,
  "delay": 1000,
  "data": null,
  "runOrder": "inOrder"
}
```

## Integration with CI/CD

The collection can be integrated with CI/CD pipelines using Newman:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run "WizPay-End-to-End-Pay-Vendor-Collection.postman_collection.json" \
  -e "WizPay-End-to-End-Pay-Environment.postman_environment.json" \
  --reporters cli,json \
  --reporter-json-export results.json
```

## Support

For additional support:

1. Check the API documentation: [README.md](./README.md)
2. Review the OpenAPI specification: [end-to-end-payin-payout-api.yaml](./end-to-end-payin-payout-api.yaml)
3. Use the debug endpoints for troubleshooting
4. Contact the development team with specific error details

---

## Changelog

### Version 2.0
- Added comprehensive test scripts
- Enhanced pre-request scripts for automatic hash generation
- Added environment variable management
- Improved error handling and validation
- Added collection runner support

### Version 1.0
- Basic collection with core endpoints
- Simple environment setup
- Basic test scripts


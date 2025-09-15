# WizPay End-to-End Payin/Payout API Documentation

## Overview

This documentation covers the end-to-end payin and payout functionality of the WizPay system. The API enables automatic matching of payin orders with payout orders, creating a seamless end-to-end payment experience.

## Key Features

- **🔄 End-to-End Matching**: Automatic matching of payin orders with payout orders
- **⚡ Instant Payout Marketplace**: Cross-vendor instant payout system
- **🔀 Partial Matching**: Support for partial amount matching with confirmation waiting
- **📦 Batch Processing**: Automated batch completion and processing
- **🔔 Real-time Updates**: Socket-based real-time notifications
- **💬 Communication**: Built-in chat system for instant payout orders

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Core Concepts](#core-concepts)
4. [API Endpoints](#api-endpoints)
5. [Integration Examples](#integration-examples)
6. [Error Handling](#error-handling)
7. [Webhooks & Callbacks](#webhooks--callbacks)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Create a Payin Order

```bash
curl -X POST "https://your-domain.com/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "x-key: your-api-key" \
  -H "x-hash: your-hmac-hash" \
  -d '{
    "type": "payin",
    "amount": 500,
    "customerMobile": "9876543210",
    "customerUPIID": "customer@paytm",
    "customerName": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refID": "f8cd2375-98d0-479f-9e3c-b4f2e0de14ed",
    "redirectURL": "https://pay.example.com/pay?refID=f8cd2375-98d0-479f-9e3c-b4f2e0de14ed",
    "matched": true,
    "matchDetails": {
      "payoutRefID": "payout-ref-123",
      "matchedAmount": 500,
      "remainingAmount": 0
    }
  }
}
```

### 2. Create a Payout Order

```bash
curl -X POST "https://your-domain.com/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "x-key: your-api-key" \
  -H "x-hash: your-hmac-hash" \
  -d '{
    "type": "payout",
    "payoutType": "instant",
    "amount": 1000,
    "accountNumber": "1234567890",
    "ifsc": "SBIN0001234",
    "bankName": "State Bank of India"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refID": "payout-ref-123",
    "instantPayoutURL": "https://payout.example.com/instant?refID=payout-ref-123"
  }
}
```

## Authentication

The API supports two authentication methods:

### 1. Vendor Authentication (x-key + x-hash)

Used for order creation and marketplace operations:

```bash
# Generate HMAC hash
echo -n '{"type":"payin","amount":500}' | openssl dgst -sha256 -hmac "your-secret" -binary | base64

# Use in request
curl -H "x-key: your-api-key" \
     -H "x-hash: generated-hash" \
     ...
```

### 2. Admin Authentication (JWT Cookie)

Used for order approval and management:

```bash
# Login first
curl -X POST "https://your-domain.com/api/v1/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "admin", "password": "password"}'

# Use cookie in subsequent requests
curl -b cookies.txt \
     ...
```

## Core Concepts

### End-to-End Matching Process

1. **Payin Order Creation**: System searches for suitable payout orders within 30-minute window
2. **Matching Algorithm**: Prioritizes exact amount matches, then partial matches
3. **Batch Creation**: Creates instant payout batch if match is found
4. **Payment Processing**: Returns redirect URL for immediate payment
5. **Confirmation**: When payment is confirmed, batch is completed automatically

### Order States

- **pending**: Order created, waiting for payment
- **success**: Payment confirmed, order completed
- **failed**: Payment failed or order expired
- **unassigned**: Payout order waiting for matching

### Instant Payout Marketplace

The marketplace allows cross-vendor instant payouts:

1. **Vendor A** creates a payout order
2. **Vendor B** can create a payin against Vendor A's payout
3. System handles the end-to-end matching and processing

## API Endpoints

### Order Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orders` | POST | Create payin/payout order |
| `/orders` | GET | List orders with pagination |
| `/orders/{refID}` | GET | Get order status |
| `/orders/{refID}` | POST | Approve order |

### Instant Payout Marketplace

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orders/instant-payout/available` | GET | List available payouts |
| `/orders/instant-payout/{refID}/create-payin` | POST | Create payin against payout |
| `/orders/instant-payout/{refID}/claim` | GET | Claim payout |

### Payin-Payout Matching

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payin-matching/complete/{payinOrderId}` | POST | Complete payin matching |
| `/payin-matching/process-pending` | POST | Process pending matches |
| `/payin-matching/status` | GET | Get matching status |

### Batch Processing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/instant-payout/complete/{payinOrderId}` | POST | Complete instant payout batch |
| `/instant-payout/process-pending` | POST | Process pending batches |
| `/orders/{refID}/confirm-batch` | POST | Confirm batch transaction |

## Integration Examples

### Example 1: Complete End-to-End Flow

```javascript
// 1. Create payout order
const payoutResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-key': 'your-api-key',
    'x-hash': 'your-hash'
  },
  body: JSON.stringify({
    type: 'payout',
    payoutType: 'instant',
    amount: 1000,
    accountNumber: '1234567890',
    ifsc: 'SBIN0001234',
    bankName: 'State Bank of India'
  })
});

const payoutData = await payoutResponse.json();
console.log('Payout created:', payoutData.data.refID);

// 2. Create payin order (should match automatically)
const payinResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-key': 'your-api-key',
    'x-hash': 'your-hash'
  },
  body: JSON.stringify({
    type: 'payin',
    amount: 500, // Partial amount
    customerMobile: '9876543210',
    customerUPIID: 'customer@paytm'
  })
});

const payinData = await payinResponse.json();
console.log('Payin created:', payinData.data.refID);

if (payinData.data.matched) {
  console.log('✅ Matched! Redirect to:', payinData.data.redirectURL);
  
  // 3. Simulate payment completion
  const approveResponse = await fetch(`/api/v1/orders/${payinData.data.refID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'auth=your-jwt-token'
    },
    body: JSON.stringify({
      transactionID: 'TXN123456789'
    })
  });
  
  console.log('Order approved:', await approveResponse.json());
}
```

### Example 2: Cross-Vendor Instant Payout

```javascript
// 1. List available payouts from other vendors
const availableResponse = await fetch('/api/v1/orders/instant-payout/available?minAmount=100&maxAmount=1000', {
  headers: {
    'x-key': 'your-api-key',
    'x-hash': 'your-hash'
  }
});

const availableData = await availableResponse.json();
console.log('Available payouts:', availableData.data);

// 2. Create payin against specific payout
const selectedPayout = availableData.data[0];
const createPayinResponse = await fetch(`/api/v1/orders/instant-payout/${selectedPayout.refID}/create-payin`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-key': 'your-api-key',
    'x-hash': 'your-hash',
    'vendor': 'your-vendor-id'
  },
  body: JSON.stringify({
    amount: 500,
    customerUPIID: 'customer@paytm',
    customerMobile: '9876543210'
  })
});

const payinData = await createPayinResponse.json();
console.log('Cross-vendor payin created:', payinData.data.payinRefID);
```

### Example 3: Batch Processing

```javascript
// Process all pending payin matching
const processResponse = await fetch('/api/v1/payin-matching/process-pending', {
  method: 'POST'
});

const processData = await processResponse.json();
console.log(`Processed ${processData.data.processed} out of ${processData.data.total} orders`);

// Complete specific payin matching
const completeResponse = await fetch('/api/v1/payin-matching/complete/123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transactionId: 'TXN123456789',
    confirmedBy: 'admin'
  })
});

const completeData = await completeResponse.json();
console.log('Matching completed:', completeData.message);
```

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_PARAMETERS` | Invalid request parameters | Check request body |
| `UNAUTHORIZED` | Authentication failed | Verify API key/hash |
| `FORBIDDEN` | Insufficient permissions | Check user role |
| `NOT_FOUND` | Resource not found | Verify resource ID |
| `INSUFFICIENT_BALANCE` | Not enough balance for payout | Check payout balance |
| `ORDER_EXPIRED` | Order has expired | Create new order |
| `MATCHING_FAILED` | No suitable match found | Try different amount |

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-key': 'your-api-key',
      'x-hash': 'your-hash'
    },
    body: JSON.stringify(orderData)
  });

  const data = await response.json();

  if (!data.success) {
    switch (data.error) {
      case 'INVALID_PARAMETERS':
        console.error('Invalid parameters:', data.message);
        break;
      case 'UNAUTHORIZED':
        console.error('Authentication failed');
        break;
      case 'INSUFFICIENT_BALANCE':
        console.error('Not enough balance for payout');
        break;
      default:
        console.error('Unknown error:', data.message);
    }
  } else {
    console.log('Success:', data.data);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Webhooks & Callbacks

The system supports webhooks for order status updates:

### Webhook Payload

```json
{
  "event": "order.completed",
  "data": {
    "refID": "f8cd2375-98d0-479f-9e3c-b4f2e0de14ed",
    "type": "payin",
    "amount": 500,
    "status": "success",
    "transactionID": "TXN123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Webhook Events

- `order.created`: Order created
- `order.matched`: Order matched with payout
- `order.completed`: Order completed successfully
- `order.failed`: Order failed
- `batch.completed`: Batch processing completed

## Testing

### Test Environment

```bash
# Base URL for testing
BASE_URL="http://localhost:3000/api/v1"

# Test API key and secret
API_KEY="test-api-key"
API_SECRET="test-api-secret"
```

### Test Scripts

```bash
# Test order creation
curl -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "x-key: $API_KEY" \
  -H "x-hash: $(echo -n '{"type":"payin","amount":100}' | openssl dgst -sha256 -hmac "$API_SECRET" -binary | base64)" \
  -d '{
    "type": "payin",
    "amount": 100,
    "customerMobile": "9876543210",
    "customerUPIID": "test@paytm"
  }'

# Test order status
curl "$BASE_URL/orders/your-ref-id"

# Test payin matching
curl -X POST "$BASE_URL/payin-matching/process-pending"
```

### Debug Endpoints

```bash
# Debug available payouts
curl "$BASE_URL/orders/debug/payouts?vendor=testvendor&amount=100"

# Health check
curl "$BASE_URL/health-monitor/instant-payout"
```

## Troubleshooting

### Common Issues

#### 1. Orders Not Matching

**Problem**: Payin orders not finding matching payouts

**Solutions**:
- Check if payout orders exist within 30-minute window
- Verify payout orders have `is_instant_payout = 1`
- Ensure payout orders have sufficient `instant_balance`
- Check vendor restrictions

**Debug**:
```bash
curl "$BASE_URL/orders/debug/payouts?vendor=your-vendor&amount=500"
```

#### 2. Authentication Failures

**Problem**: Getting 401 Unauthorized errors

**Solutions**:
- Verify API key is correct
- Check HMAC hash generation
- Ensure secret key matches
- Verify request body is properly formatted

**Hash Generation**:
```bash
# Correct way to generate hash
echo -n '{"type":"payin","amount":100}' | openssl dgst -sha256 -hmac "your-secret" -binary | base64
```

#### 3. Batch Processing Issues

**Problem**: Batches not completing automatically

**Solutions**:
- Check if payin orders have `paymentStatus = 'success'`
- Verify associated batches exist
- Run manual batch processing
- Check for database constraints

**Manual Processing**:
```bash
curl -X POST "$BASE_URL/payin-matching/process-pending"
```

#### 4. Socket Connection Issues

**Problem**: Real-time updates not working

**Solutions**:
- Check socket server is running
- Verify socket channel names
- Check client-side socket connection
- Review socket authentication

### Logs and Monitoring

```bash
# Check application logs
tail -f logs/app.log | grep "payin\|payout\|matching"

# Monitor system health
curl "$BASE_URL/health-monitor/instant-payout"

# Check pending orders
curl "$BASE_URL/payin-matching/status"
```

### Performance Optimization

1. **Database Indexing**: Ensure proper indexes on order tables
2. **Connection Pooling**: Monitor database connection usage
3. **Caching**: Implement Redis caching for frequent queries
4. **Batch Processing**: Use batch endpoints for bulk operations

### Support

For additional support:

1. Check the debug endpoints for system status
2. Review application logs for detailed error information
3. Use the health monitoring endpoints
4. Contact the development team with specific error codes and logs

---

## API Reference

For complete API reference, see: [end-to-end-payin-payout-api.yaml](./end-to-end-payin-payout-api.yaml)

## Changelog

### Version 2.0
- Added instant payout marketplace
- Enhanced partial matching support
- Improved batch processing
- Added real-time chat functionality
- Enhanced error handling and debugging

### Version 1.0
- Basic payin/payout order creation
- Simple end-to-end matching
- Basic batch processing


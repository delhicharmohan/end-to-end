# Frontend Notification System for Instant Payout

## Overview

The frontend notification system provides real-time feedback to users about their instant payout orders, including timeout events, reassignments, and balance updates.

## Notification Types

### 1. Timeout Notifications

**Trigger**: When a payin order expires due to customer inactivity
**Appearance**: Red notification with warning icon
**Duration**: 10 seconds (auto-dismiss)

**Socket Event**:
```javascript
{
  type: 'timeout',
  message: 'Previous customer timed out. Waiting for new customer.',
  remainingBalance: 200
}
```

### 2. Reassignment Notifications

**Trigger**: When an order is reassigned to a new customer
**Appearance**: Blue notification with refresh icon
**Duration**: 10 seconds (auto-dismiss)

**Socket Event**:
```javascript
{
  type: 'reassignment',
  message: 'Your order has been reassigned to a new customer.',
  remainingBalance: 200
}
```

### 3. Balance Update Notifications

**Trigger**: When the remaining balance is updated
**Appearance**: Green success message
**Duration**: 3 seconds (auto-dismiss)

**Socket Event**:
```javascript
{
  type: 'balance_update',
  message: 'Balance updated: ₹200',
  remainingBalance: 200
}
```

## Implementation Details

### Socket Event Handling

The frontend listens for socket events on the room `instant-withdraw-${orderId}` and handles different event types:

```javascript
this.socket.on(room, (data) => {
  console.log("Socket event received:", data);
  
  // Handle different types of socket events
  if (data.type === 'timeout') {
    this.handleTimeoutEvent(data);
  } else if (data.type === 'reassignment') {
    this.handleReassignmentEvent(data);
  } else if (data.type === 'balance_update') {
    this.handleBalanceUpdateEvent(data);
  } else {
    // Handle regular batch updates (existing logic)
    // ...
  }
});
```

### Notification Components

#### Timeout Notification
```html
<div class="timeout-notification fixed z-50 text-white rounded-lg p-3 bg-red-500 shadow-lg" 
     v-if="timeoutNotificationVisible" 
     style="top: 20px; right: 20px; max-width: 400px;">
  <div class="flex items-start">
    <span class="icon mr-2 mt-1">
      <!-- Warning icon -->
    </span>
    <div class="flex-1">
      <h4 class="font-semibold text-sm mb-1">{{ timeoutNotificationTitle }}</h4>
      <p class="text-xs opacity-90">{{ timeoutNotificationMessage }}</p>
      <div class="mt-2 flex space-x-2">
        <button @click="dismissTimeoutNotification">Dismiss</button>
        <button @click="refreshOrderStatus">Refresh</button>
      </div>
    </div>
  </div>
</div>
```

#### Reassignment Notification
```html
<div class="reassignment-notification fixed z-50 text-white rounded-lg p-3 bg-blue-500 shadow-lg" 
     v-if="reassignmentNotificationVisible" 
     style="top: 20px; right: 20px; max-width: 400px;">
  <!-- Similar structure with different styling -->
</div>
```

### Batch Status Visualization

The batch transactions list now shows different statuses with color coding:

- **Pending**: Gray background, "I Confirm" button
- **Confirmed**: Green background, "Confirmed" label
- **Expired**: Red background, "Expired" label

```html
<div class="flex justify-between items-center border rounded-lg p-4" 
     :class="getBatchItemClass(item)">
  <div>
    <p class="text-lg font-bold" :class="getAmountTextClass(item)">₹{{ item.amount }}</p>
    <p class="text-xs text-gray-500">UTR: {{ item.utr_no || 'Pending' }}</p>
    <p v-if="item.status === 'expired'" class="text-xs text-red-500 font-medium">EXPIRED</p>
  </div>
  <div class="text-right">
    <!-- Status-specific buttons/labels -->
  </div>
</div>
```

## CSS Styling

### Animation Classes
```css
/* Notification animations */
.timeout-notification,
.reassignment-notification {
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Status-specific styling */
.timeout-notification {
  border-left: 4px solid #dc2626;
}

.reassignment-notification {
  border-left: 4px solid #3b82f6;
}

/* Hover effects */
.timeout-notification:hover,
.reassignment-notification:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}
```

### Batch Item Styling
```javascript
// Get CSS class for batch item background
getBatchItemClass(item) {
  if (item.status === 'expired') {
    return 'bg-red-50 border-red-200';
  } else if (item.confirmed_by_customer_at) {
    return 'bg-green-50 border-green-200';
  } else {
    return 'bg-gray-50 border-gray-200';
  }
}

// Get CSS class for amount text color
getAmountTextClass(item) {
  if (item.status === 'expired') {
    return 'text-red-600';
  } else if (item.confirmed_by_customer_at) {
    return 'text-green-600';
  } else {
    return 'text-gray-800';
  }
}
```

## Event Handlers

### Timeout Event Handler
```javascript
handleTimeoutEvent(data) {
  console.log("Handling timeout event:", data);
  this.timeoutNotificationTitle = "Order Timeout";
  this.timeoutNotificationMessage = data.message || "Previous customer timed out. Waiting for new customer.";
  this.timeoutNotificationVisible = true;
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    this.dismissTimeoutNotification();
  }, 10000);
}
```

### Reassignment Event Handler
```javascript
handleReassignmentEvent(data) {
  console.log("Handling reassignment event:", data);
  this.reassignmentNotificationTitle = "Order Reassigned";
  this.reassignmentNotificationMessage = data.message || "Your order has been reassigned to a new customer.";
  this.reassignmentNotificationVisible = true;
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    this.dismissReassignmentNotification();
  }, 10000);
}
```

### Balance Update Event Handler
```javascript
handleBalanceUpdateEvent(data) {
  console.log("Handling balance update event:", data);
  this.message = data.message || `Balance updated: ₹${data.remainingBalance}`;
  this.showMessage();
  
  // Update the balance in the UI
  if (data.remainingBalance !== undefined) {
    this.balance = data.remainingBalance;
  }
}
```

## Testing

### Manual Testing
You can test the notifications using the test component:

```html
<notification-test @socket-event="handleSocketEvent" />
```

### Test Events
1. **Timeout Test**: Simulates a timeout event
2. **Reassignment Test**: Simulates a reassignment event  
3. **Balance Update Test**: Simulates a balance update event

## Integration with Backend

The frontend notifications are triggered by socket events emitted from the backend:

1. **Timeout Processing**: `payinTimeoutHandler.js` emits timeout events
2. **Reassignment**: `payinTimeoutHandler.js` emits reassignment events
3. **Balance Updates**: `processRemainingAmount.js` emits balance update events

## User Experience Features

### 1. Non-Intrusive Design
- Notifications appear in the top-right corner
- Auto-dismiss after appropriate time
- Manual dismiss option available

### 2. Clear Visual Hierarchy
- Color-coded notifications (red for timeout, blue for reassignment)
- Icons for quick recognition
- Clear action buttons

### 3. Responsive Design
- Notifications adapt to screen size
- Mobile-friendly touch targets
- Smooth animations

### 4. Accessibility
- High contrast colors
- Clear text labels
- Keyboard navigation support

## Future Enhancements

### 1. Sound Notifications
- Audio alerts for important events
- User-configurable sound settings

### 2. Push Notifications
- Browser push notifications
- Mobile app notifications

### 3. Notification History
- Persistent notification log
- Search and filter options

### 4. Customization
- User preference settings
- Notification frequency controls
- Theme customization

This notification system ensures users are always informed about the status of their instant payout orders, providing transparency and improving the overall user experience.

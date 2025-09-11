<template>
  <div class="chat-window" :class="{ 'open-full': isOpen && isMobile }" v-show="isOpen || !hideWhenClosed">
    <div class="chat-header" @click="toggleChat">
      <div class="flex items-center relative">
        <span class="font-medium">Chat Support</span>
        <span class="ml-2 text-sm">({{ unreadCount > 0 ? unreadCount + ' new' : 'Online' }})</span>
        <!-- Red dot notification indicator -->
        <div v-if="unreadCount > 0 && !isOpen" class="notification-dot" :title="`${unreadCount} unread messages`"></div>
      </div>
      <button class="chat-toggle">
        {{ isOpen ? '−' : '+' }}
      </button>
      <!-- Temporary test button for notification -->
      <button @click="simulateMessage" class="test-notification-btn" title="Test notification">
        🔴
      </button>
    </div>
    
    <div v-if="isOpen" class="chat-body">
      <div ref="messagesContainer" class="messages-container">
        <div v-for="(msg, index) in messages" :key="index" 
             :class="['message', msg.sender === 'user' ? 'sent' : 'received']">
          <div class="message-content">
            <template v-if="isImageUrl(msg.text)">
              <a :href="msg.text" target="_blank" rel="noopener">
                <img :src="msg.text" alt="attachment" class="max-w-full rounded" style="max-height: 180px;" />
              </a>
            </template>
            <template v-else>
              {{ msg.text }}
            </template>
          </div>
          <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>

      <div class="chat-input-container">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Type your message..."
          @keyup.enter="sendMessage"
          class="chat-input"
        />

        <!-- Hidden file input for attachments -->
        <input ref="attachInput" type="file" accept="image/*" class="hidden" @change="onAttachmentSelected" />

        <!-- Attach button -->
        <button @click="onPickAttachment" class="send-button" title="Attach image" style="margin-right:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 6.5l-7.8 7.8a3 3 0 104.24 4.24l8.13-8.13a5 5 0 10-7.07-7.07L5.5 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Send button -->
        <button @click="sendMessage" class="send-button" title="Send">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { io } from 'socket.io-client';
import http from '../../http-common';

export default {
  name: 'ChatWindow',
  props: {
    orderId: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    userType: {
      type: String, // 'payer' or 'payee'
      required: true
    },
    initialMessages: {
      type: Array,
      default: () => []
    },
    hideWhenClosed: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { emit }) {
    const isOpen = ref(false);
    const newMessage = ref('');
    const sending = ref(false);
    const messages = ref([...props.initialMessages]);
    const unreadCount = ref(0);
    const messagesContainer = ref(null);
    let socket = null;
    const isMobile = ref(false);

    const isImageUrl = (text) => {
      if (!text || typeof text !== 'string') return false;
      try {
        const u = new URL(text);
        const path = u.pathname.toLowerCase();
        if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp')) {
          return true;
        }
        return u.host.includes('googleapis.com');
      } catch (_) {
        return false;
      }
    };

    const onAttachmentSelected = async (evt) => {
      try {
        const file = evt?.target?.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append('upload_screenshot', file);
        const uploadRes = await http.post(`/orders/${props.orderId}/chat-attachment`, form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const url = uploadRes?.data?.url;
        if (url) {
          newMessage.value = url;
          await sendMessage();
        }
      } catch (err) {
        console.error('Attachment upload failed:', err);
      } finally {
        if (evt?.target) evt.target.value = '';
      }
    };

    const onPickAttachment = () => {
      if (typeof window !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = onAttachmentSelected;
        input.click();
      }
    };

    const openChat = () => {
      if (!isOpen.value) {
        isOpen.value = true;
        unreadCount.value = 0;
        scrollToBottom();
        emit('open-changed', true);
      }
    };

    const closeChat = () => {
      if (isOpen.value) {
        isOpen.value = false;
        emit('open-changed', false);
      }
    };

    const toggleChat = () => {
      isOpen.value = !isOpen.value;
      emit('open-changed', isOpen.value);
      if (isOpen.value) {
        unreadCount.value = 0;
        emit('unread-count-changed', 0);
        scrollToBottom();
      }
    };

    const sendMessage = async () => {
      if (sending.value) return;
      if (!newMessage.value.trim()) return;
      sending.value = true;

      const nowIso = new Date().toISOString();
      const outgoing = newMessage.value.trim();

      try {
        const clientNonce = `${props.userType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        console.log(`[ChatWindow] Sending message for order ${props.orderId}:`, outgoing);
        
        await http.post(`/orders/${props.orderId}/chat-public`, {
          message: outgoing,
          senderType: props.userType,
          clientNonce
        });
        
        // Add message optimistically to UI
        messages.value.push({
          text: outgoing,
          sender: 'user',
          timestamp: nowIso
        });
        newMessage.value = '';
        scrollToBottom();
        console.log(`[ChatWindow] Message sent successfully`);
      } catch (error) {
        console.error('[ChatWindow] Error sending message:', error);
        // TODO: Show error message to user
      } finally {
        sending.value = false;
      }
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };

    const fetchChatHistory = async () => {
      try {
        const response = await http.get(`/orders/${props.orderId}/chat-public`);
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        messages.value = rows.map(msg => ({
          text: msg.message,
          timestamp: msg.created_at,
          sender: (msg.sender_type === props.userType) ? 'user' : 'other'
        }));
        console.log(`[ChatWindow] Loaded ${rows.length} chat messages for order ${props.orderId}`);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    const initializeSocket = () => {
      socket = io(process.env.VUE_APP_SOCKET_URL || window.location.origin, { path: '/wizpay-socket-path' });
      
      socket.on('connect', () => {
        console.log(`[ChatWindow] Connected to socket server for order ${props.orderId}`);
        // Join the payin room for this order (works for both payin and payout orders)
        socket.emit('join-payin-room', { refID: props.orderId });
        socket.emit('chat:join', { refID: props.orderId });
        console.log(`[ChatWindow] Joined chat room for order ${props.orderId}`);
      });

      // Remove any previous listener before adding
      socket.off('chat:message');

      // Track last seen signature to avoid processing duplicates
      let lastSig = null;

      socket.on('chat:message', (payload) => {
        console.log(`[ChatWindow] Received chat message:`, payload);
        const isFromOtherUser = payload.senderType !== props.userType;
        
        // Ignore echo of own message to prevent duplicates; we already push optimistically on send
        if (!isFromOtherUser) {
          console.log(`[ChatWindow] Ignoring echo message from same user type: ${payload.senderType}`);
          return;
        }

        // De-duplicate by signature (message + sender + second-resolution ts)
        const tsSec = payload.ts ? Math.floor(Number(payload.ts) / 1000) : Math.floor(Date.now() / 1000);
        const sig = `${payload.senderType}|${payload.message}|${tsSec}`;
        if (sig === lastSig) {
          console.log(`[ChatWindow] Ignoring duplicate message with signature: ${sig}`);
          return;
        }
        lastSig = sig;

        messages.value.push({
          text: payload.message,
          timestamp: payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString(),
          sender: 'other'
        });
        
        if (!isOpen.value && isFromOtherUser) {
          unreadCount.value++;
          emit('unread-count-changed', unreadCount.value);
          console.log(`[ChatWindow] Incremented unread count to ${unreadCount.value} - notification should appear`);
        } else {
          scrollToBottom();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('[ChatWindow] Socket connection error:', error);
      });
    };

    onMounted(() => {
      const syncIsMobile = () => {
        isMobile.value = window.matchMedia('(max-width: 640px)').matches;
      };
      syncIsMobile();
      window.addEventListener('resize', syncIsMobile);
      initializeSocket();
      fetchChatHistory();
    });

    onUnmounted(() => {
      if (socket) {
        socket.disconnect();
      }
      window.removeEventListener('resize', () => {});
    });

    watch(() => props.initialMessages, (newMessages) => {
      messages.value = [...newMessages];
      scrollToBottom();
    });

    const simulateMessage = (event) => {
      event.stopPropagation(); // Prevent chat toggle
      
      // Close chat first if it's open
      if (isOpen.value) {
        isOpen.value = false;
        emit('open-changed', false);
      }
      
      // Add a test message
      messages.value.push({
        text: 'Test notification message',
        timestamp: new Date().toISOString(),
        sender: 'other'
      });
      
      // Increment unread count to trigger notification
      unreadCount.value++;
      emit('unread-count-changed', unreadCount.value);
      console.log(`[ChatWindow] Simulated message - unreadCount: ${unreadCount.value}, isOpen: ${isOpen.value}`);
    };


    return {
      isOpen,
      newMessage,
      messages,
      unreadCount,
      messagesContainer,
      toggleChat,
      openChat,
      closeChat,
      sendMessage,
      formatTime,
      onPickAttachment,
      onAttachmentSelected,
      isImageUrl,
      isMobile,
      simulateMessage
    };
  }
};
</script>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Fullscreen on mobile when open */
@media (max-width: 640px) {
  .chat-window.open-full {
    width: 100vw;
    height: 100vh;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
  .chat-body {
    height: calc(100vh - 48px);
  }
}

.chat-header {
  background: #2563eb;
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.chat-toggle {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
}

.chat-body {
  display: flex;
  flex-direction: column;
  height: 400px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #f9fafb;
}

.message {
  margin-bottom: 12px;
  max-width: 80%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.sent {
  margin-left: auto;
  text-align: right;
}

.message.received {
  margin-right: auto;
  text-align: left;
}

.message-content {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.message.sent .message-content {
  background: #2563eb;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.received .message-content {
  background: #e5e7eb;
  color: #111827;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #6b7280;
  margin-top: 4px;
  padding: 0 4px;
}

.chat-input-container {
  display: flex;
  padding: 12px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.chat-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.send-button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover {
  background: #1d4ed8;
}

.send-button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

/* Scrollbar styles */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Red dot notification indicator */
.notification-dot {
  position: absolute;
  top: -8px;
  right: -12px;
  width: 16px;
  height: 16px;
  background-color: #ef4444;
  border-radius: 50%;
  border: 3px solid white;
  z-index: 10000;
  animation: pulse-notification 1.5s infinite;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

@keyframes pulse-notification {
  0% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
  50% {
    transform: scale(1.2);
    opacity: 0.9;
    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.6);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
}

/* Test notification button */
.test-notification-btn {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  margin-left: 8px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.test-notification-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
</style>

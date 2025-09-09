<template>
  <div class="instant-available">
    <h2>Instant Payout Opportunities</h2>
    <div class="actions">
      <button @click="fetchList" :disabled="loading">Reload</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading">Loading...</div>

    <table v-if="!loading && rows.length">
      <thead>
        <tr>
          <th>Amount</th>
          <th>Instant Balance</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.refID">
          <td>{{ r.amount.toFixed(2) }}</td>
          <td>{{ r.instant_balance.toFixed(2) }}</td>
          <td>
            <button @click="createPayin(r)" :disabled="creating[r.refID]">Approve</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else-if="!loading && !rows.length">No opportunities right now.</div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  name: 'InstantPayoutAvailable',
  data() {
    return {
      rows: [],
      loading: false,
      creating: {},
      error: '',
      socket: null,
    }
  },
  mounted() {
    this.fetchList();
    // Basic socket connection (adjust path if required in back-end)
    this.socket = io('/', { path: '/socket.io', withCredentials: true });
    // Replace with actual vendor context from your app state
    const vendor = localStorage.getItem('vendor') || 'gocomart';
    this.socket.on(`${vendor}-instant-payout-available-updated`, () => {
      this.fetchList();
    });
  },
  methods: {
    async fetchList() {
      try {
        this.loading = true;
        this.error = '';
        const vendor = localStorage.getItem('vendor') || 'gocomart';
        const xKey = localStorage.getItem('xKey') || '';
        const secret = localStorage.getItem('secret') || '';
        const body = ''; // GET: sign empty body
        const xHash = await this.computeHmac(body, secret);
        const res = await fetch('/api/v1/orders/instant-payout/available', {
          method: 'GET',
          headers: { 'vendor': vendor, 'x-key': xKey, 'x-hash': xHash },
          credentials: 'include'
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Fetch failed');
        this.rows = json.data || [];
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async createPayin(row) {
      try {
        this.$set(this.creating, row.refID, true);
        const vendor = localStorage.getItem('vendor') || 'gocomart';
        const xKey = localStorage.getItem('xKey') || '';
        const secret = localStorage.getItem('secret') || '';
        const payload = JSON.stringify({ amount: row.instant_balance, idempotencyKey: crypto.randomUUID() });
        const xHash = await this.computeHmac(payload, secret);
        const res = await fetch(`/api/v1/orders/instant-payout/${row.refID}/create-payin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'vendor': vendor, 'x-key': xKey, 'x-hash': xHash },
          body: payload,
          credentials: 'include'
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Create failed');
        window.location.href = `/#/pay/${json.data.payinRefID}`; // navigate to pay page
      } catch (e) {
        alert(e.message);
        this.fetchList();
      } finally {
        this.$set(this.creating, row.refID, false);
      }
    },
    async computeHmac(body, secret) {
      // Browser HMAC SHA-256 base64
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await window.crypto.subtle.sign('HMAC', key, enc.encode(body));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
      return b64;
    }
  }
}
</script>

<style scoped>
.instant-available { padding: 16px; }
.actions { margin-bottom: 12px; }
.error { color: #c00; margin: 8px 0; }
 table { width: 100%; border-collapse: collapse; }
 th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
 button { padding: 6px 10px; }
</style>

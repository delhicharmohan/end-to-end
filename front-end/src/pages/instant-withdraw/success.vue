<template>
  <div class="h-screen w-full flex flex-col bg-gray-100 items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="green"
        class="w-16 h-16 mx-auto text-green-500">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <h1 class="text-2xl font-semibold text-green-600 mt-4 mb-2">Withdrawal Completed!</h1>
      <p class="text-gray-600">Your instant payout has been successfully processed.</p>
      
      <div v-if="withdrawalDetails" class="mt-6 bg-gray-50 p-4 rounded-lg">
        <div class="text-left space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Amount:</span>
            <span class="font-semibold">₹{{ withdrawalDetails.amount }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Order ID:</span>
            <span class="font-semibold">{{ withdrawalDetails.refID }}</span>
          </div>
          <div v-if="withdrawalDetails.utr" class="flex justify-between">
            <span class="text-gray-600">UTR:</span>
            <div class="flex items-center">
              <span class="font-semibold mr-2">{{ withdrawalDetails.utr }}</span>
              <svg v-if="isUtrCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="currentColor" class="w-4 h-4 cursor-pointer text-green-500">
                <path fill-rule="evenodd"
                  d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                  clip-rule="evenodd" />
                <path
                  d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
              </svg>
              <svg v-else @click.stop="copyUtrToClipboard" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                class="w-4 h-4 cursor-pointer hover:text-blue-500">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Completed At:</span>
            <span class="font-semibold">{{ formatDate(withdrawalDetails.completedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Buttons removed as per requirement: no buttons on success page -->
    </div>
  </div>
</template>

<script>
export default {
  name: "WithdrawalSuccess",
  data() {
    return {
      withdrawalDetails: null,
      isUtrCopied: false,
    };
  },
  watch: {
    isUtrCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isUtrCopied = false;
        }, 2000);
      }
    },
  },
  created() {
    // Get withdrawal details from localStorage
    const details = localStorage.getItem('withdrawalSuccess');
    if (details) {
      this.withdrawalDetails = JSON.parse(details);
      localStorage.removeItem('withdrawalSuccess');
    }
  },
  methods: {
    copyUtrToClipboard() {
      if (this.withdrawalDetails?.utr) {
        navigator.clipboard.writeText(this.withdrawalDetails.utr);
        this.isUtrCopied = true;
      }
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }
};
</script>

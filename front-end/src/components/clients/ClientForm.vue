<template>
  <form @submit.prevent="submitForm" class="flex flex-row flex-wrap px-4 mt-4 mb-4">
    <div class="w-full flex flex-row flex-wrap mt-4 border p-8 rounded-xl shadow-lg">
      <div class="w-1/2 pr-4" :class="{ invalid: !vendorName.isValid }">
        <label for="vendorName">Vendor</label>
        <div v-if="mode == 'update'" class="border rounded-lg px-4 py-2 bg-gray-100">
          {{ vendorName.val }}
        </div>
        <select v-else v-model.trim="vendorName.val" @blur="clearValidity('vendorName')" id="vendorName">
          <option value="">Select a vendor</option>
          <option v-for="(vendor, index) in filteredVendors" :key="index" :value="vendor.username">{{ vendor.username }}
          </option>
        </select>
        <p v-if="!vendorName.isValid" class="text-xs text-red-600">
          Vendor must not be empty.
        </p>
      </div>
      <div class="w-1/2 pl-4" :class="{ invalid: !clientName.isValid }">
        <label for="clientName">Client Name</label>
        <div v-if="mode == 'update'" class="border rounded-lg px-4 py-2 bg-gray-100">
          {{ clientName.val }}
        </div>
        <input v-else type="text" id="clientName" v-model.trim="clientName.val" @blur="clearValidity('clientName')" />
        <p v-if="!clientName.isValid" class="text-xs text-red-600">
          Client Name must not be empty.
        </p>
      </div>
      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !secret.isValid }">
        <label for="secret">Secret Key</label>
        <input type="text" id="secret" v-model.trim="secret.val" @blur="clearValidity('secret')" />
        <p v-if="!secret.isValid" class="text-xs text-red-600">
          Secret Key must not be empty.
        </p>
      </div>
      <div class="mt-4 w-1/2 pl-4" :class="{ invalid: !xKey.isValid }">
        <label for="xKey">x-Key</label>
        <input type="text" id="xKey" v-model.trim="xKey.val" @blur="clearValidity('xKey')" />
        <p v-if="!xKey.isValid" class="text-xs text-red-600">
          xKey must not be empty.
        </p>
      </div>


      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !is_instant_payout.isValid }">
        <label for="is_instant_payout">Instant Payment Enabled</label>


        <select id="is_instant_payout" v-model.trim="is_instant_payout.val" @blur="clearValidity('is_instant_payout')">
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
        <p v-if="!is_instant_payout.isValid" class="text-xs text-red-600">
          Instant Payment must not be empty.
        </p>


      </div>
      <div class="mt-4 w-1/2 pl-4" :class="{ invalid: !walletCallBackURL.isValid }">
        <label for="walletCallBackURL">Wallet CallBack URL</label>
        <input type="text" id="walletCallBackURL" v-model.trim="walletCallBackURL.val"
          @blur="clearValidity('walletCallBackURL')" />
        <p v-if="!walletCallBackURL.isValid" class="text-xs text-red-600">
          {{ walletCallBackURL.msg }}
        </p>
      </div>

      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !callbackURL.isValid }">
        <label for="callbackURL">Pay In Callback URL</label>
        <input type="text" id="callbackURL" v-model.trim="callbackURL.val" @blur="clearValidity('callbackURL')" />
        <p v-if="!callbackURL.isValid" class="text-xs text-red-600">
          {{ callbackURL.msg }}
        </p>
      </div>
      <div class="mt-4 w-1/2 pl-4" :class="{ invalid: !payOutCallbackURL.isValid }">
        <label for="payOutCallbackURL">Pay Out Callback URL</label>
        <input type="text" id="payOutCallbackURL" v-model.trim="payOutCallbackURL.val"
          @blur="clearValidity('payOutCallbackURL')" />
        <p v-if="!payOutCallbackURL.isValid" class="text-xs text-red-600">
          {{ payOutCallbackURL.msg }}
        </p>
      </div>
      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !failedOrderCallbackURL.isValid }">
        <label for="failedOrderCallbackURL">Failed Order Callback URL</label>
        <input type="text" id="failedOrderCallbackURL" v-model.trim="failedOrderCallbackURL.val"
          @blur="clearValidity('failedOrderCallbackURL')" />
        <p v-if="!failedOrderCallbackURL.isValid" class="text-xs text-red-600">
          {{ failedOrderCallbackURL.msg }}
        </p>
      </div>

      <div class="mt-4 w-1/2 pl-4" :class="{ invalid: !instantPayoutLimit.isValid }">
        <label for="payOutCallbackURL">Instant Payout Limit (per transaction)</label>
        <input type="text" id="instantPayoutLimit" v-model.trim="instantPayoutLimit.val"
          @blur="clearValidity('instantPayoutLimit')" />
        <p v-if="!instantPayoutLimit.isValid" class="text-xs text-red-600">
          {{ instantPayoutLimit.msg }}
        </p>
      </div>
    </div>
    <div class="w-full flex flex-col justify-center items-center mt-8">
      <p v-if="!formIsValid" class="mb-4 text-red-600">
        Please fix the above errors and submit again.
      </p>
      <base-button><span class="capitalize">{{ mode }}</span></base-button>
    </div>
  </form>
</template>

<script>
export default {
  name: "client-form",
  emits: ["create-client"],
  props: ["mode", "selectedClient"],
  created() {
    this.getVendors();
  },
  mounted() {
    if (this.mode == "update") {
      this.setClient();
    }
  },
  data() {
    return {
      is_instant_payout: {
        val: 0,
        isValid: true,
        msg: "",
      },
      vendorName: {
        val: "",
        isValid: true,
        msg: "",
      },
      clientName: {
        val: "",
        isValid: true,
        msg: "",
      },
      secret: {
        val: "",
        isValid: true,
        msg: "",
      },
      xKey: {
        val: "",
        isValid: true,
        msg: "",
      },
      callbackURL: {
        val: "",
        isValid: true,
        msg: "",
      },
      payOutCallbackURL: {
        val: "",
        isValid: true,
        msg: "",
      },

      walletCallBackURL: {
        val: "",
        isValid: true,
        msg: "",
      },
      instantPayoutLimit: {
        val: "",
        isValid: true,
        msg: "",
      },
      failedOrderCallbackURL: {
        val: "",
        isValid: true,
        msg: "",
      },
      formIsValid: true,
    };
  },
  computed: {
    filteredVendors() {
      return this.$store.getters["vendor/users"];
    },
  },
  methods: {
    async getVendors() {
      try {
        await this.$store.dispatch("vendor/getUsers");
      } catch (error) {
        console.log(error.message);
      }
    },
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;

      if (this.mode == "create") {
        if (this.vendorName.val === "") {
          this.vendorName.isValid = false;
          this.formIsValid = false;
        }
        if (this.clientName.val === "") {
          this.clientName.isValid = false;
          this.formIsValid = false;
        }
      }

      if (this.is_instant_payout.val === "") {
        this.is_instant_payout.isValid = false;
        this.formIsValid = false;
      }


      if (this.instantPayoutLimit.val === "" || this.instantPayoutLimit.val === '0.0000') {
        this.instantPayoutLimit.isValid = false;
        this.formIsValid = false;
      }
      if (this.secret.val === "") {
        this.secret.isValid = false;
        this.formIsValid = false;
      }
      if (this.xKey.val === "") {
        this.xKey.isValid = false;
        this.formIsValid = false;
      }
      if (this.callbackURL.val === "") {
        this.callbackURL.isValid = false;
        this.callbackURL.msg = "Pay In Callback URL must not be empty.";
        this.formIsValid = false;
      }

      if (this.walletCallBackURL.val === "") {
        this.walletCallBackURL.isValid = false;
        this.walletCallBackURL.msg = "Wallet Callback must not be empty.";
        this.formIsValid = false;
      }
      if (this.payOutCallbackURL.val === "") {
        this.payOutCallbackURL.isValid = false;
        this.payOutCallbackURL.msg = "Pay Out Callback URL must not be empty.";
        this.formIsValid = false;
      }
      if (this.failedOrderCallbackURL.val === "") {
        this.failedOrderCallbackURL.isValid = false;
        this.failedOrderCallbackURL.msg = "Failed Order Callback URL must not be empty.";
        this.formIsValid = false;
      }
    },
    submitForm() {
      this.validateForm();

      if (!this.formIsValid) {
        return;
      }
      let formData = {
        secret: this.secret.val,
        vendor: this.vendorName.val,
        clientName: this.clientName.val,
        xKey: this.xKey.val,
        callbackURL: this.callbackURL.val,
        wallet_callback: this.walletCallBackURL.val,
        payOutCallbackURL: this.payOutCallbackURL.val,
        failedOrderCallbackURL: this.failedOrderCallbackURL.val,
        is_instant_payout: this.is_instant_payout.val,
        instant_payout_limit: this.instantPayoutLimit.val
      };

      this.$emit("create-client", formData);
    },
    setClient() {
      this.vendorName.val = this.selectedClient.vendor;
      this.clientName.val = this.selectedClient.clientName;
      this.secret.val = this.selectedClient.secret;
      this.xKey.val = this.selectedClient.xKey;
      this.callbackURL.val = this.selectedClient.callbackURL;
      this.payOutCallbackURL.val = this.selectedClient.payOutCallbackURL;
      this.failedOrderCallbackURL.val = this.selectedClient.failedOrderCallbackURL;
      this.is_instant_payout.val = this.selectedClient.is_instant_payout;
      this.walletCallBackURL.val = this.selectedClient.wallet_callback;
      this.instantPayoutLimit.val = this.selectedClient.instant_payout_limit;
    },
  },
};
</script>

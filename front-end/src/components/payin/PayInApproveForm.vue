<template>
  <form
    @submit.prevent="submitForm"
    class="h-full w-full flex flex-row flex-wrap"
  >
    <div class="w-1/2 flex flex-col">
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Receipt:</div>
        <div class="text-color-2 text-sm font-semibold ml-2 uppercase">
          {{ item.receiptId }}
        </div>
      </div>
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Client Name:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.customerName }}
        </div>
      </div>
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Client UPI:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.customerUPIID }}
        </div>
      </div>
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Customer UTR:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.customerUtr }}
        </div>
      </div>
      <!-- <div class="flex mb-2">
        <div class="text-color-1 text-sm">Client Mobile:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.customerMobile }}
        </div>
      </div>
      <div class="flex">
        <div class="text-color-1 text-sm">Client IP:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.customerIp }}
        </div>
      </div> -->
    </div>
    <div class="w-1/2 flex flex-col">
      <!-- <div class="flex mb-2">
        <div class="text-color-1 text-sm">Platform:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.clientName }}
        </div>
      </div> -->
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Order Id:</div>
        <div class="text-color-2 text-sm font-semibold ml-2 break-all">
          {{ item.merchantOrderId }}
        </div>
      </div>
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Assigned To:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.validatorUsername }}
        </div>
      </div>
      <div v-if="isAdmin" class="flex mb-2">
        <div class="text-color-1 text-sm">Assigned UPI:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.validatorUPIID }}
        </div>
      </div>
      <!-- <div class="flex">
        <div class="text-color-1 text-sm">Payment Type:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ item.mode }}
        </div>
      </div> -->
      <div class="flex mb-2">
        <div class="text-color-1 text-sm">Created:</div>
        <div class="text-color-2 text-sm font-semibold ml-2">
          {{ formatDate }}
        </div>
      </div>
      <div class="flex mb-2 items-center">
        <div class="text-color-1 text-sm">Amount:</div>
        <div class="text-color-2 text-lg text-green-600 font-semibold ml-2">
          {{ getAmount }}
        </div>
      </div>
    </div>
    <div class="w-full mt-4" :class="{ invalid: !transactionID.isValid }">
      <input
        type="text"
        id="transaction-id"
        v-model.trim="transactionID.val"
        placeholder="UTR Code"
        @blur="clearValidity('transactionID')"
      />
      <p v-if="!transactionID.isValid" class="text-xs text-red-600">
        UTR Code must not be empty.
      </p>
    </div>
    <div class="w-full flex justify-center mt-4">
      <button
        v-if="isLoading"
        type="button"
        class="w-40 py-2 rounded-lg border border-green-600 bg-green-600 text-white flex justify-center items-center cursor-not-allowed"
      >
        <icon-spinner class="text-white"></icon-spinner>
        <h1 class="ml-2">Confirming...</h1>
      </button>
      <button
        v-else
        type="submit"
        class="w-40 py-2 rounded-lg border border-green-600 hover:bg-green-600 text-green-600 hover:text-white flex justify-center items-center zoom-in"
      >
        Confirm
      </button>
    </div>
  </form>
</template>

<script>
import IconSpinner from "../icons/IconSpinner.vue";
export default {
  name: "pay-inapprove-form",
  props: ["item"],
  emits: ["form-response"],
  components: { IconSpinner },
  data() {
    return {
      transactionID: {
        val: "",
        isValid: true,
        msg: "",
      },
      formIsValid: true,
      isLoading: false,
    };
  },
  computed: {
    getAmount() {
      if (this.item.amount) {
        if (this.item.txnFee) {
          return this.item.amount
        } else {
          return parseInt(this.item.amount);
        }
      } else {
        return "";
      }
    },
    isAdmin() {
      if (this.$store.getters.isAdmin) {
        return true;
      } else {
        return false;
      }
    },
    formatDate() {
      const date = new Date(this.item.createdAt);

      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const ampm = hours >= 12 ? "pm" : "am";

      const formattedDate = `${day}-${month}-${year} ${hours %
        12}:${minutes}:${seconds} ${ampm}`;

      return formattedDate;
    },
  },
  methods: {
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;
      if (this.transactionID.val === "") {
        this.transactionID.isValid = false;
        this.formIsValid = false;
      }
    },
    async submitForm() {
      this.validateForm();

      if (!this.formIsValid) {
        return;
      }

      const formData = {
        refID: this.item.refID,
        transactionID: this.transactionID.val,
      };

      this.isLoading = true;

      try {
        await this.$store.dispatch("payin/approveOrder", formData);
        this.transactionID = {
          val: "",
          isValid: true,
          msg: "",
        };
        this.$emit("form-response", "success", "Order approved successfully.");
      } catch (error) {
        this.error = error.message || "Something failed!";
        this.$emit("form-response", "failed", this.error);
      }

      this.isLoading = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.bg1 {
  background-color: green;
}
</style>

<template>
  <div class="w-full flex items-center">
    <!-- <div class="flex-shrink-0 mr-4 text-lg font-semibold">{{ slNo }}</div> -->
    <div
      class="flex-grow rounded-xl flex flex-col bg-1 shadow-lg relative mb-4"
    >
      <base-dialog
        :show="!!error"
        title="An error occurred!"
        @close="handleError"
      >
        <p>{{ error }}</p>
      </base-dialog>
      <base-toast
        v-if="!!baseToast.message"
        :message="baseToast.message"
        :type="baseToast.type"
        @close="handleBaseToast"
      ></base-toast>
      <base-dialog
        :show="showPayInApproveModal"
        title="Approve Order"
        @close="showPayInApproveModal = false"
      >
        <pay-in-approve-form
          :key="item.receiptId"
          :item="selectedItem"
          @form-response="formResponse"
        ></pay-in-approve-form>
      </base-dialog>
      <base-dialog
        :show="showAddUtrModal"
        title="Add UTR"
        @close="showAddUtrModal = false"
      >
        <add-utr-form
          :key="item.receiptId"
          :item="selectedItem"
          @form-response="utrFormResponse"
        ></add-utr-form>
      </base-dialog>
      <div class="flex flex-row flex-wrap">
        <div class="w-3/4 p-4 flex flex-row flex-wrap">
          <div class="w-1/2 flex flex-col">
            <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Receipt:
              </div>
              <div class="text-color-2 font-semibold ml-2 uppercase">
                {{ item.receiptId }}
              </div>
            </div>
            <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Client Name:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.customerName }}
              </div>
            </div>
            <div v-if="isAdmin" class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Client UPI:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.customerUPIID }}
              </div>
            </div>
            <!-- <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">Client Mobile:</div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.customerMobile }}
              </div>
            </div>
            <div class="flex">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">Client IP:</div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.customerIp }}
              </div>
            </div> -->
            <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Created At:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ formatDate(item.createdAt) }}
              </div>
            </div>
            <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Approved At:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ formatDate(item.updatedAt) }}
              </div>
            </div>
            <div v-if="isAdmin || isSubAdmin" class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Approved By:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ getApprovedBy }}
              </div>
            </div>
            <div v-if="item.created_by" class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Order Creator:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ getCreatedBy }}
              </div>
            </div>
          </div>
          <div class="w-1/2 flex flex-col">
            <!-- <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">Platform:</div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.clientName }}
              </div>
            </div> -->
            <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Order Id:
              </div>
              <div class="text-color-2 font-semibold ml-2 break-all">
                {{ item.merchantOrderId }}
              </div>
            </div>
            <!-- <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">Created:</div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.createdAt }}
              </div>
            </div> -->
            <div v-if="isAdmin || isSubAdmin" class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Assigned To:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.validatorUsername }}
              </div>
            </div>
            <div v-if="isAdmin || isSubAdmin" class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Assigned UPI:
              </div>
              <div class="text-color-2 font-semibold ml-2 break-all">
                {{ item.validatorUPIID }}
              </div>
            </div>
            <div v-if="!isAdmin" class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Client UPI:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.customerUPIID }}
              </div>
            </div>
            <div class="flex items-center mb-2">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                UTR:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.transactionID }}
              </div>
            </div>
            <div class="flex items-center mb-2">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Customer UTR:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.customerUtr }}
              </div>
            </div>
            <div class="flex items-center mb-2">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Website:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.website }}
              </div>
            </div>
            <div v-if="item.upload_screenshot" class="flex items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Attachment:
              </div>
              <a :href="item.upload_screenshot" target="_blank" class="font-semibold text-sm ml-2 text-blue-600 hover:underline">View</a>
            </div>
          </div>
        </div>
        <div
          class="w-1/4 flex flex-col items-center justify-center  p-4  border-l relative"
        >
          <div
            :class="getClass"
            class="px-4 py-2 rounded-full text-white uppercase text-xs"
          >
            {{ item.paymentStatus }}
          </div>
          <div v-if="item.amount" class="text-2xl font-semibold mt-2">
            {{ getAmount }}
          </div>
          <div
            @click.stop="approveOrder"
            v-if="
              ((item.customerUPIID || item.customerUPIID == '') && item.paymentStatus == 'pending' && !isSubAdmin) ||
                (item.paymentStatus == 'expired' && isAdmin) && item.amount
            "
            class="w-full max-w-200 flex justify-center mt-2 bg-2 px-4 py-2 rounded-lg shadow-lg text-white uppercase text-sm font-medium cursor-pointer zoom-in"
          >
            Approve
          </div>
          <div v-if="isSubAdmin && item.paymentStatus == 'pending' && !item.customerUtr" class="flex justify-center mt-2">
            <div @click.stop="addUtr" class="h-8 flex items-center justify-center border px-4 bg-wizpay-red hover:bg-white text-white hover:text-wizpay-red border-wizpay-red rounded-lg cursor-pointer text-sm">
              Add UTR
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PayInApproveForm from "./PayInApproveForm.vue";
import AddUtrForm from "./AddUtrForm.vue";
export default {
  name: "pay-in-item",
  props: ["item", "slNo"],
  components: {
    PayInApproveForm,
    AddUtrForm,
  },
  data() {
    return {
      showPayInApproveModal: false,
      showAddUtrModal: false,
      baseToast: {
        type: "",
        message: "",
      },
      error: null,
      selectedItem: null,
    };
  },
  computed: {
    getCreatedBy() {
      if (this.item.created_by == 'common_link') {
        return "Common Link";
      } else {
        return this.item.created_by;
      }
    },
    getAmount() {
      if (this.item.txnFee) {
        return this.item.amount;
      } else {
        return parseInt(this.item.amount);
      }
    },
    getClass() {
      if (this.item.paymentStatus == "pending") {
        return "bg-blue-500";
      } else if (this.item.paymentStatus == "approved") {
        return "bg-green-600";
      } else if (this.item.paymentStatus == "rejected") {
        return "bg-yellow-600";
      } else if (this.item.paymentStatus == "unassigned") {
        return "bg-gray-600";
      } else if (this.item.paymentStatus == "expired") {
        return "bg-red-600";
      } else {
        return "bg-black";
      }
    },
    isAdmin() {
      if (this.$store.getters.isAdmin) {
        return true;
      } else {
        return false;
      }
    },
    isSubAdmin() {
      if (this.$store.getters.isSubAdmin) {
        return true;
      } else {
        return false;
      }
    },
    getApprovedBy() {
      if (this.item.approvedBy == "user") {
        return `${this.item.validatorUsername}(User)`;
      } else if (this.item.approvedBy == "subadmin") {
        return `${
          this.item.approvedByUsername
            ? this.item.approvedByUsername
            : this.item.validatorUsername
        }(Sub Admin)`;
      } else if (this.item.approvedBy == "admin") {
        return "Admin";
      } else {
        return "";
      }
    },
  },
  methods: {
    addUtr() {
      this.selectedItem = this.item;
      this.showAddUtrModal = true;
    },
    formatDate(inputDate) {
      const x = inputDate.replace("T", " ");
      const y = x.replace(".000Z", "");

      const date = new Date(y);

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
    approveOrder() {
      this.selectedItem = this.item;
      this.showPayInApproveModal = true;
    },
    handleError() {
      this.error = null;
    },
    handleBaseToast() {
      this.baseToast = {
        type: "",
        message: "",
      };
    },
    formResponse(status, message) {
      this.showPayInApproveModal = false;
      if (status == "success") {
        this.baseToast.type = status;
        this.baseToast.message = message;
        let $this = this;
        setTimeout(() => {
          $this.handleBaseToast();
        }, 1000);
      } else {
        this.error = message;
      }
    },
    utrFormResponse(status, message) {
      this.showAddUtrModal = false;
      if (status) {
        this.baseToast.type = 'success';
        this.baseToast.message = message;
        let $this = this;
        setTimeout(() => {
          $this.handleBaseToast();
        }, 1000);
      } else {
        this.error = message;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.bg-1 {
  background-color: #f8f9fa;
}
.bg-2 {
  background-image: linear-gradient(310deg, #7928ca, #ff0080);
}
.text-color-1 {
  color: #67748e;
}
.text-color-2 {
  color: #344767;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.max-w-200 {
  max-width: 200px;
}
</style>

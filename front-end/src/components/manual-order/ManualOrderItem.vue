<template>
  <div class="w-full flex items-center">
    <div
      class="flex-grow rounded-xl flex flex-col bg-1 shadow-lg relative mb-4"
    >
      <div class="flex flex-row flex-wrap">
        <div class="w-3/4 p-4 flex flex-row flex-wrap">
          <div class="w-1/2 flex flex-col">
            <div class="flex mb-2 items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Type:
              </div>
              <div class="text-color-2 font-semibold ml-2 uppercase">
                {{ item.type }}
              </div>
            </div>
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
            <div v-if="item.type == 'payout'">
              <div class="flex mb-2 items-center">
                <div class="text-color-1 text-sm uppercase flex-shrink-0">
                  Account Number:
                </div>
                <div class="text-color-2 font-semibold ml-2">
                  {{ item.accountNumber }}
                </div>
              </div>
              <div class="flex mb-2 items-center">
                <div class="text-color-1 text-sm uppercase flex-shrink-0">
                  IFSC:
                </div>
                <div class="text-color-2 font-semibold ml-2">
                  {{ item.ifsc }}
                </div>
              </div>
              <div class="flex mb-2 items-center">
                <div class="text-color-1 text-sm uppercase flex-shrink-0">
                  Bank Name:
                </div>
                <div class="text-color-2 font-semibold ml-2">
                  {{ item.bankName }}
                </div>
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
            <div class="flex items-center">
              <div class="text-color-1 text-sm uppercase flex-shrink-0">
                Website:
              </div>
              <div class="text-color-2 font-semibold ml-2">
                {{ item.website }}
              </div>
            </div>
          </div>
          <div v-if="item.type == 'payin' || (item.type == 'payout' && item.isPayoutLink)" class="w-full">
            <div>
              <div class="flex mb-2 items-center">
                <div class="text-color-1 text-sm uppercase flex-shrink-0">
                  Payment URL:
                </div>
                <div class="text-blue-600 font-semibold ml-2 cursor-pointer" @click.stop="copyToClipBoardPaymentUrl">
                  {{ getPaymentUrl }}
                </div>
                <div class="ml-4">
                  <svg v-if="isPaymentUrlCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 cursor-pointer">
                    <title>Copied</title>
                    <path fill-rule="evenodd" d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z" clip-rule="evenodd" />
                    <path d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
                    <path d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
                  </svg>
                  <svg v-else @click.stop="copyToClipBoardPaymentUrl" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 cursor-pointer">
                    <title>Copy to clipboard</title>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                  </svg>
                </div>
              </div>
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

          <div class="w-full flex justify-between items-center flex-wrap mt-2">
            <div
              @click.stop="approveOrder"
              v-if="showApproveRejectBtn"
              class="w-24 flex justify-center mt-2 bg-green-600 px-4 py-2 rounded-lg shadow-lg text-white uppercase text-sm font-medium cursor-pointer zoom-in"
            >
              Approve
            </div>
            <div
              @click.stop="rejectOrder"
              v-if="showApproveRejectBtn"
              class="w-24 flex justify-center mt-2 bg-red-600 px-4 py-2 rounded-lg shadow-lg text-white uppercase text-sm font-medium cursor-pointer zoom-in"
            >
              Reject
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import http from "../../http-common";
export default {
  name: "manual-order-item",
  props: ["item", "slNo", "reload"],
  data() {
    return {
      isPaymentUrlCopied: false,
    };
  },
  watch: {
    isPaymentUrlCopied(newVal) {
      if (newVal) {
        setTimeout(()=>{
          this.isPaymentUrlCopied = false;
        }, 3000)
      }
    },
  },
  computed: {
    getAmount() {
      if (this.item.txnFee) {
        return this.item.actualAmount;
      } else {
        return parseInt(this.item.amount);
      }
    },
    showApproveRejectBtn() {
      if (this.item.type == 'payout' && this.item.amount && this.item.paymentStatus == 'pending' && this.item.isPayoutLink && (this.item.isApprovedByMOU === null)) {
        return true;
      } else {
        return false;
      }
    },
    getPaymentUrl() {
      if (this.item.type == 'payin') {
        return `${process.env.VUE_APP_BASE_URL}/#/create-payin/${this.item.refID}?receiptId=${this.item.receiptId}`;
      } else {
        return `${process.env.VUE_APP_BASE_URL}/#/create-payout/${this.item.refID}?receiptId=${this.item.receiptId}`;
      }
    },
    getClass() {
      if (this.item.paymentStatus == "pending") {
        return "bg-blue-500";
      } else if (this.item.paymentStatus == "approved") {
        return "bg-green-600";
      } else if (this.item.paymentStatus == "rejected" || this.item.paymentStatus == "failed") {
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
    copyToClipBoardPaymentUrl() {
      const concatenatedString = `${this.item.receiptId}\n\n${this.getPaymentUrl}`;
      navigator.clipboard.writeText(concatenatedString);
      this.isPaymentUrlCopied = true;
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
    async approveOrder() {
      const formData = {
        paymentStatus: "pending",
        isApprovedByMOU: 1,
      }

      let url = `/orders/${this.item.refID}/updatePayOutLinkOrder`;
      try {
        const response = await http.post(url, formData);
        if (response.status == 201) {
          this.$emit('reload');
        }
      } catch (error) {
        this.$swal.fire({
          icon: 'error',
          title: error.code,
          text: error.message,
        }).then((result) => {
            if (result.value || result.dismiss) {
              this.$emit('reload');
            }
        })
      }

    },
    rejectOrder() {
      this.$swal
        .fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, reject it!",
        })
        .then(async (result) => {
          if (result.isConfirmed) {

            const formData = {
              paymentStatus: "failed",
              isApprovedByMOU: 0,
            }

            let url = `/orders/${this.item.refID}/updatePayOutLinkOrder`;
            try {
              const response = await http.post(url, formData);
              if (response.status == 201) {
                this.$emit('reload');
              }
            } catch (error) {
              this.$swal.fire({
                icon: 'error',
                title: error.code,
                text: error.message,
              }).then((result) => {
                  if (result.value || result.dismiss) {
                      this.$emit('reload');
                  }
              })
            }

          }
        });
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

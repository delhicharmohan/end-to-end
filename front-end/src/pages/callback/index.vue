<template>
  <div class="h-full flex flex-col p-4">
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
    <section class="h-full flex flex-col overflow-y-auto">
      <base-card class="h-auto flex flex-col">
        <div class="flex justify-between items-center flex-wrap">
          <div class="flex justify-start items-center flex-wrap">
            <div class="flex flex-col mr-4">
              <div class="text-gray-500 text-sm mb-1">Order ID</div>
              <input
                v-model.trim="searchKeyWord"
                type="text"
                placeholder="Search"
              />
            </div>
            <div class="flex flex-col mr-4">
              <div class="text-gray-500 text-sm mb-1">Start Date</div>
              <input type="date" id="startDate" v-model.trim="startDate" />
            </div>
            <div class="flex flex-col">
              <div class="text-gray-500 text-sm mb-1">End Date</div>
              <input type="date" id="endDate" v-model.trim="endDate" />
            </div>
          </div>
          <div>
            <base-button @click.stop="clearBtnClicked">Clear</base-button>
          </div>
        </div>
      </base-card>
      <base-card class="h-full flex flex-col mt-4">
        <div class="w-full flex justify-between items-center flex-wrap">
          <div class="flex flex-col border p-4 rounded-lg mb-4">
            <h1 class="text-lg font-medium">Change Payment Status</h1>
            <div class="flex justify-start items-center flex-wrap mt-2">
              <div class="flex justify-start items-center mr-8">
                <div class="flex-shrink-0 mr-2">From</div>
                <select v-model="paymentStatus">
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="rejected">Rejected</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div class="flex justify-start items-center">
                <div class="flex-shrink-0 mr-2">To</div>
                <select v-model="toPaymentStatus">
                  <option value="failed">Failed</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>
          <div class="flex justify-start items-center flex-wrap mb-4">
            <div class="flex justify-start items-center mr-8">
              <div class="flex-shrink-0 mr-2">Payment Type</div>
              <select v-model="paymentType">
                <option value="payin">Pay In</option>
                <option value="payout">Pay Out</option>
              </select>
            </div>
            <div class="flex justify-start items-center mr-8">
              <div class="flex-shrink-0 mr-2">Customer UPI</div>
              <select v-model="customerUPIID">
                <option value="">all</option>
                <option value="1">With Customer UPI</option>
                <option value="2">Without Customer UPI</option>
              </select>
            </div>
            <div class="flex justify-start items-center">
              <div class="flex-shrink-0 mr-2">Records Per Page</div>
              <select v-model="first">
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
        <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
        <div
          v-else-if="hasFailedOrders && !isLoading"
          class="grid grid-cols-1 gap-4 mt-4 overflow-y-auto px-4 mb-4"
        >
          <div class="sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full sm:px-6 lg:px-8">
              <div class="overflow-x-auto">
                <table class="min-w-full text-left text-sm font-light">
                  <thead class="border-b font-medium dark:border-neutral-500">
                    <tr>
                      <th scope="col" class="px-6 py-4">
                        <input
                          type="checkbox"
                          v-model="selectAll"
                          @change="selectAllRows"
                        />
                      </th>
                      <th scope="col" class="px-6 py-4">#</th>
                      <th scope="col" class="px-6 py-4">Order ID</th>
                      <th scope="col" class="px-6 py-4">Receipt ID</th>
                      <th scope="col" class="px-6 py-4">Website</th>
                      <th scope="col" class="px-6 py-4">Customer Name</th>
                      <th scope="col" class="px-6 py-4">Amount</th>
                      <th scope="col" class="px-6 py-4">Payment Status</th>
                      <th scope="col" class="px-6 py-4">UTR</th>
                      <th scope="col" class="px-6 py-4">Assigned To</th>
                      <th scope="col" class="px-6 py-4">Assigned UPI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, index) in failedOrders"
                      :key="index"
                      class="border-b dark:border-neutral-500"
                    >
                      <td class="whitespace-nowrap px-6 py-4 font-medium">
                        <input type="checkbox" v-model="item.isSelected" />
                      </td>
                      <td class="whitespace-nowrap px-6 py-4 font-medium">
                        {{ paginatorInfo.firstItem + index }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.merchantOrderId }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4 uppercase">
                        {{ item.receiptId }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.website }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.customerName }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.amount }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.paymentStatus }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.transactionID }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.validatorUsername }}
                      </td>
                      <td class="whitespace-nowrap px-6 py-4">
                        {{ item.validatorUPIID }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center">
            <base-button mode="outline" @click.stop="submit"
              >Send Callback</base-button
            >
          </div>

          <div class="mt-4">
            <pagination
              :paginatorInfo="paginatorInfo"
              :setPage="setPage"
            ></pagination>
          </div>
        </div>
        <h3 v-else class="text-center font-medium mt-8">
          No <span class="capitalize">{{ paymentStatus }}</span> Orders found!
        </h3>
      </base-card>
    </section>
  </div>
</template>

<script>
import http from "../../http-common";
import Pagination from "../../components/shared/pagination.vue";

export default {
  name: "callback",
  components: {
    Pagination,
  },
  data() {
    return {
      isLoading: false,
      error: null,
      first: 10,
      page: 1,
      failedOrders: [],
      paginatorInfo: [],
      selectAll: false,
      baseToast: {
        type: "",
        message: "",
      },
      searchKeyWord: "",
      startDate: "",
      endDate: "",
      paymentStatus: "pending",
      toPaymentStatus: "failed",
      formIsValid: true,
      paymentType: "payin",
      customerUPIID: "2",
    };
  },
  watch: {
    page() {
      this.getFailedOrders();
    },
    first() {
      this.getFailedOrders();
    },
    searchKeyWord() {
      this.page = 1;
      this.getFailedOrders();
    },
    startDate(newVal) {
      if (this.endDate || newVal == "") {
        this.page = 1;
        this.getFailedOrders();
      }
    },
    endDate(newVal) {
      if (this.startDate || newVal == "") {
        this.page = 1;
        this.getFailedOrders();
      }
    },
    paymentStatus() {
      this.page = 1;
      this.getFailedOrders();
    },
    paymentType() {
      this.page = 1;
      this.getFailedOrders();
    },
    customerUPIID() {
      this.page = 1;
      this.getFailedOrders();
    },
  },
  computed: {
    hasFailedOrders() {
      return this.failedOrders && this.failedOrders.length > 0;
    },
  },
  created() {
    this.getFailedOrders();
  },
  methods: {
    setPage(page) {
      this.page = page;
    },
    async getFailedOrders() {
      this.isLoading = true;
      try {
        let url = `/callback?first=${this.first}&page=${this.page}&searchKeyWord=${this.searchKeyWord}&startDate=${this.startDate}&endDate=${this.endDate}&paymentStatus=${this.paymentStatus}&paymentType=${this.paymentType}&customerUPIID=${this.customerUPIID}`;
        const response = await http.get(url);
        if (response.status == 200) {
          this.failedOrders = response.data.data.map((row) => {
            return {
              ...row,
              isSelected: false,
            };
          });
          this.paginatorInfo = response.data.pagination;
        } else {
          this.error = new Error("Unauthorized: You are not an admin.");
        }
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },
    handleError() {
      this.error = null;
    },
    selectAllRows() {
      this.failedOrders.forEach((row) => {
        row.isSelected = this.selectAll;
      });
    },
    validateForm() {
      this.formIsValid = true;

      let message = "";

      if (this.paymentStatus == "") {
        message = "You must select From Payment Status.";
        this.formIsValid = false;
      }

      if (this.toPaymentStatus == "") {
        message += "You must select To Payment Status.";
        this.formIsValid = false;
      }

      return message;

    },
    async submit() {

      let error_msg = this.validateForm();
      if (!this.formIsValid) {

        this.$swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: error_msg,
        }).then((result) => {
            if (result.value || result.dismiss) {
                error_msg = null
            }
        })

        return;
      }

      const selectedIds = this.failedOrders
        .filter((row) => row.isSelected)
        .map((row) => row.refID);

      if (selectedIds.length == 0) {

        this.$swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: "You must select at least 1 order!",
        }).then((result) => {
            if (result.value || result.dismiss) {
              console.log('You must select at least 1 order!');
            }
        })

        return;
      }

      this.isLoading = true;

      let url = `/callback`;
      try {
        const response = await http.post(url, { selectedIds: selectedIds, paymentStatus: this.toPaymentStatus });
        if (response.status == 201) {
          this.baseToast.type = "success";
          this.baseToast.message = response.data.message;
          setTimeout(() => {
            this.handleBaseToast();
            this.getFailedOrders();
          }, 1000);
        }
      } catch (error) {
        this.error = error.message || "Something failed!";
      }

      this.isLoading = false;
      this.selectAll = false;
      this.page = 1;
    },
    handleBaseToast() {
      this.baseToast = {
        type: "",
        message: "",
      };
    },
    clearBtnClicked() {
      this.searchKeyWord = "";
      this.startDate = "";
      this.endDate = "";
    },
  },
};
</script>

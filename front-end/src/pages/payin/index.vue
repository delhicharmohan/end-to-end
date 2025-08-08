<template>
  <div class="h-full flex flex-col p-4">
    <base-dialog :show="!!error" title="An error occurred!" @close="handleError">
      <p>{{ error }}</p>
    </base-dialog>
    <section key="2" class="h-full flex flex-col">
      <base-card class="h-full flex flex-col">
        <div class="flex justify-end pr-4">
          <base-button v-if="!showSearch" mode="outline" @click.stop="searchBtnClicked">Search</base-button>
          <base-button v-else @click.stop="cancelBtnClicked">Cancel</base-button>
        </div>

        <div v-if="showSearch" class="flex flex-col mx-4 bg-gray-200 mt-4 pb-4 rounded-lg">
          <div class="w-full flex px-4 pt-4">
            <div class="w-full flex items-center">
              <input type="checkbox" id="advanceSearch" v-model.trim="advanceSearch" />
              <label for="pay-in" class="mb-0 text-gray-500 ml-2">Advance Search</label>
            </div>
          </div>
          <div :class="isAdmin ? 'grid-cols-4' : 'grid-cols-3'" class="w-full grid gap-8 mt-4 px-4">
            <div class="flex flex-col">
              <input v-model.trim="searchKeyWord" type="text" placeholder="Search" />
              <p v-if="advanceSearch" class="text-gray-500 text-xs mt-1 pl-2">
                Client Name, UPI, Order ID, Receipt ID, and UTR
              </p>
              <p v-else class="text-gray-500 text-xs mt-1 pl-2">
                Receipt ID
              </p>
            </div>
            <div class="flex flex-col">
              <input v-model.trim="amount" type="number" placeholder="Amount" />
            </div>
            <div v-if="isAdmin" class="flex flex-col">
              <select v-model.trim="validatorUsername">
                <option value="">All</option>
                <option v-for="(agent, index) in agents" :key="index" :value="agent.username">{{ agent.username }}
                </option>
              </select>
            </div>
            <div class="flex flex-col">
              <select v-model.trim="paymentStatus">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="unassigned">Unassigned</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div class="w-full flex flex-row flex-wrap mt-4 px-4">
            <div class="w-1/2 pr-4">
              <div class="text-gray-500 text-sm mb-1 pl-2">Start Date</div>
              <input type="date" id="startDate" v-model.trim="startDate" />
            </div>
            <div class="w-1/2 pl-4">
              <div class="text-gray-500 text-sm mb-1 pl-2">End Date</div>
              <input type="date" id="endDate" v-model.trim="endDate" />
            </div>
          </div>
        </div>

        <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
        <div v-else-if="hasPayInList && !isLoading" class="flex-auto flex flex-col mt-4 overflow-y-auto px-4 mb-4">
          <div class="grid grid-cols-1 gap-4">
            <pay-in-item v-for="(item, index) in filteredPayInList" :key="index" :item="item"
              :sl-no="paginatorInfo.firstItem + index"></pay-in-item>
          </div>
          <div class="mt-4 flex-auto flex flex-col justify-end">
            <pagination :paginatorInfo="paginatorInfo" :setPage="setPage"></pagination>
          </div>
        </div>
        <h3 v-else
          class="text-center font-medium flex-auto flex flex-col justify-center items-center text-base sm:text-xl">
          No Pay In transactions found!
        </h3>
      </base-card>
    </section>
  </div>
</template>

<script>
import PayInItem from "../../components/payin/PayInItem.vue";
import http from "../../http-common";
import io from "socket.io-client";
import Pagination from "../../components/shared/pagination.vue";

export default {
  name: "pay-in",
  components: {
    PayInItem,
    Pagination,
  },
  data() {
    return {
      isLoading: false,
      error: null,
      baseToast: {
        type: "",
        message: "",
      },
      channel: null,
      showSearch: false,
      advanceSearch: false,
      searchKeyWord: "",
      amount: null,
      paymentStatus: "",
      validatorUsername: "",
      startDate: "",
      endDate: "",
      usersWithRole: [],
      socket: null,
      first: 10,
      page: 1,
    };
  },
  watch: {
    page() {
      this.getPayInList();
    },
    showSearch(newVal) {
      if (newVal) {
        const currentDate = new Date().toISOString().split("T")[0];
        this.startDate = this.endDate = currentDate;
      }
      if (!newVal) {
        this.startDate = this.endDate = "";
        this.getPayInList();
      }
    },
    advanceSearch() {
      if (this.searchKeyWord != "") {
        this.page = 1;
        this.getPayInList();
      }
    },
    searchKeyWord() {
      this.page = 1;
      this.getPayInList();
    },
    amount() {
      this.page = 1;
      this.getPayInList();
    },
    paymentStatus() {
      this.page = 1;
      this.getPayInList();
    },
    validatorUsername() {
      this.page = 1;
      this.getPayInList();
    },
    startDate(newVal) {
      if (this.endDate || newVal == "") {
        this.page = 1;
        this.getPayInList();
      }
    },
    endDate(newVal) {
      if (this.startDate || newVal == "") {
        this.page = 1;
        this.getPayInList();
      }
    },
  },
  computed: {
    isAdmin() {
      if (this.$store.getters.isAdmin) {
        return true;
      } else {
        return false;
      }
    },
    paginatorInfo() {
      return this.$store.getters["payin/pagination"];
    },
    filteredPayInList() {
      return this.$store.getters["payin/payInList"];
    },
    hasPayInList() {
      return this.$store.getters["payin/hasPayInList"];
    },
    role() {
      return this.$store.getters.role;
    },
    username() {
      return this.$store.getters.username;
    },
    agents() {
      return this.usersWithRole;
    },
    vendor() {
      return this.$store.getters.vendor;
    },
  },
  created() {
    this.socket = io(process.env.VUE_APP_SOCKET_URL, {
      path: "/wizpay-socket-path",
    });

    // Handle events
    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    this.getPayInList();
    this.getUsersWithRole();

    // Bind event handlers here
    if (this.role == "admin" || this.role == "subadmin") {
      this.socket.on(`${this.vendor}-order-created`, (data) => {
        this.addOrderToPayInList(data);
      });
      this.socket.on(`${this.vendor}-order-amount-created`, (data) => {
        this.updateAmountAndStatus(data);
      });
    } else {
      this.socket.on(
        `${this.vendor}-order-created-${this.username}`,
        (data) => {
          this.addOrderToPayInList(data);
        }
      );
      this.socket.on(
        `${this.vendor}-order-amount-created-${this.username}`,
        (data) => {
          this.updateAmountAndStatus(data);
        }
      );
    }
    this.socket.on(`${this.vendor}-customer-upi-updated`, (data) => {
      this.updateCustomerUpiID(data);
    });
    this.socket.on(`${this.vendor}-customer-utr-updated`, (data) => {
      this.updateCustomerUtr(data);
    });
    this.socket.on(`${this.vendor}-order-update-status-and-trnx`, (data) => {
      this.updateStatusAndTransaction(data);
    });
    this.socket.on("order-approved-auto", (data) => {
      this.autoOrderApproved(data);
    });
  },
  methods: {
    setPage(page) {
      this.page = page;
    },
    sendMessage() {
      this.socket.emit("message", this.message);
      this.message = "";
    },
    async getUsersWithRole() {
      try {
        const response = await http.get("/users/user");

        if (response.status == 200) {
          this.usersWithRole = response.data;
        }
      } catch (error) {
        console.log(error);
      }
    },
    updateStatusAndTransaction(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updateStatusAndTransaction", data);
      }
    },
    updateAmountAndStatus(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updateAmountAndStatus", data);
      }
    },
    updateCustomerUpiID(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updateCustomerUpiID", data);
      }
    },
    updateCustomerUtr(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updateCustomerUtr", data);
      }
    },
    autoOrderApproved(data) {
      this.$store.commit("payin/setPaymentStatusAndUtr", data);
    },
    addOrderToPayInList(data) {
      if (!this.showSearch && this.page == 1 && data.type == "payin") {
        this.$store.commit("payin/addOrderToPayInList", data);
      }
    },
    async getPayInList() {
      const params = {
        type: "payin",
        advanceSearch: this.advanceSearch,
        searchKeyWord: this.searchKeyWord,
        amount: this.amount,
        paymentStatus: this.paymentStatus,
        validatorUsername: this.validatorUsername,
        startDate: this.startDate,
        endDate: this.endDate,
        first: this.first,
        page: this.page,
      };
      this.isLoading = true;
      try {
        await this.$store.dispatch("payin/getPayInList", params);
        // console.log(this.$store.getters["payin/pagination"]);
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },
    handleError() {
      this.error = null;
    },
    searchBtnClicked() {
      this.showSearch = true;
    },
    cancelBtnClicked() {
      this.showSearch = false;
      this.advanceSearch = false;
      this.searchKeyWord = "";
      this.amount = null;
      this.paymentStatus = "";
      this.validatorUsername = "";
      this.startDate = "";
      this.endDate = "";
    },
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  },
};
</script>

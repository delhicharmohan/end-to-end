<template>
  <div class="h-full flex flex-col p-4">
    <base-dialog :show="!!error" title="An error occurred!" @close="handleError">
      <p>{{ error }}</p>
    </base-dialog>
    <base-toast v-if="!!baseToast.message" :message="baseToast.message" :type="baseToast.type"
      @close="handleBaseToast"></base-toast>
    <section key="2" class="h-full flex flex-col">
      <base-card class="h-full flex flex-col">
        <div class="flex items-center mx-4 mb-4 border rounded-lg px-4 py-3">
          <div class="font-bold">Deposit Link:</div>
          <a :href="getDepositLink" target="_blank" class="ml-2 text-blue-600 font-semibold cursor-pointer">{{
            getDepositLink }}</a>
          <div class="ml-2">
            <svg v-if="isDepositLinkCopied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              class="w-5 h-5 cursor-pointer">
              <title>Copied</title>
              <path fill-rule="evenodd"
                d="M17.663 3.118c.225.015.45.032.673.05C19.876 3.298 21 4.604 21 6.109v9.642a3 3 0 01-3 3V16.5c0-5.922-4.576-10.775-10.384-11.217.324-1.132 1.3-2.01 2.548-2.114.224-.019.448-.036.673-.051A3 3 0 0113.5 1.5H15a3 3 0 012.663 1.618zM12 4.5A1.5 1.5 0 0113.5 3H15a1.5 1.5 0 011.5 1.5H12z"
                clip-rule="evenodd" />
              <path
                d="M3 8.625c0-1.036.84-1.875 1.875-1.875h.375A3.75 3.75 0 019 10.5v1.875c0 1.036.84 1.875 1.875 1.875h1.875A3.75 3.75 0 0116.5 18v2.625c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625v-12z" />
              <path
                d="M10.5 10.5a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963 5.23 5.23 0 00-3.434-1.279h-1.875a.375.375 0 01-.375-.375V10.5z" />
            </svg>
            <svg v-else @click.stop="copyToClipBoardDepositLink" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 cursor-pointer">
              <title>Copy to clipboard</title>
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
            </svg>
          </div>
        </div>
        <div class="flex justify-between items-center px-4">
          <div class="flex justify-start items-center flex-wrap">
            <div class="flex justify-start items-center mr-4">
              <div class="flex-shrink-0 mr-2">Records Per Page</div>
              <select v-model="first">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div class="flex justify-start">
            <div class="mr-8">
              <base-button v-if="!showSearch" mode="outline" @click.stop="searchBtnClicked">Search</base-button>
              <base-button v-else @click.stop="cancelBtnClicked">Cancel</base-button>
            </div>
            <base-button v-if="isOrderCreator" mode="outline" @click.stop="openCreateOrderModal">Create
              Order</base-button>
          </div>
        </div>

        <div v-if="showSearch" class="flex flex-col mx-4 bg-gray-200 mt-4 pb-4 rounded-lg">
          <div class="w-full flex px-4 pt-4">
            <div class="w-full flex items-center">
              <input type="checkbox" id="advanceSearch" v-model.trim="advanceSearch" />
              <label for="pay-in" class="mb-0 text-gray-500 ml-2">Advance Search</label>
            </div>
          </div>

          <div class="w-full grid grid-cols-2 gap-8 mt-4 px-4">
            <div class="flex flex-col">
              <input v-model.trim="searchKeyWord" type="text" placeholder="Search" />
              <p v-if="advanceSearch" class="text-gray-500 text-xs mt-1 pl-2">
                Client Name, UPI, Order ID, Receipt ID, and UTR
              </p>
              <p v-else class="text-gray-500 text-xs mt-1 pl-2">
                Receipt ID
              </p>
            </div>
            <!-- <div class="flex flex-col">
              <input v-model.trim="amount" type="number" placeholder="Amount" />
            </div>
            <div v-if="isAdmin" class="flex flex-col">
              <select v-model.trim="validatorUsername">
                <option value="">All</option>
                <option
                  v-for="(agent, index) in agents"
                  :key="index"
                  :value="agent.username"
                  >{{ agent.username }}</option
                >
              </select>
            </div> -->
            <div class="flex flex-col">
              <select v-model.trim="paymentStatus">
                <option value="">All</option>
                <option value="created">Created</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <!-- <option value="unassigned">Unassigned</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option> -->
              </select>
            </div>
          </div>

          <!-- <div class="w-full flex flex-row flex-wrap mt-4 px-4">
            <div class="w-1/2 pr-4">
              <div class="text-gray-500 text-sm mb-1 pl-2">Start Date</div>
              <input type="date" id="startDate" v-model.trim="startDate" />
            </div>
            <div class="w-1/2 pl-4">
              <div class="text-gray-500 text-sm mb-1 pl-2">End Date</div>
              <input type="date" id="startDate" v-model.trim="endDate" />
            </div>
          </div> -->
        </div>

        <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
        <div v-else-if="hasPayOutList && !isLoading" class="flex-auto flex flex-col mt-4 overflow-y-auto px-4 mb-4">
          <div class="grid grid-cols-1 gap-4">
            <manual-order-item v-for="(item, index) in filteredPayOutList" :key="index" :item="item"
              :sl-no="paginatorInfo.firstItem + index" @reload="reloadPage"></manual-order-item>
          </div>
          <div class="mt-4 flex-auto flex flex-col justify-end">
            <pagination :paginatorInfo="paginatorInfo" :setPage="setPage"></pagination>
          </div>
        </div>
        <h3 v-else
          class="text-center font-medium flex-auto flex flex-col justify-center items-center text-base sm:text-xl">
          No Manual Orders found!
        </h3>
      </base-card>
    </section>

    <transition name="fade" mode="out-in">
      <base-modal v-if="createOrderModal" title="Create Order" @close="closeCreateOrderModal">
        <base-spinner v-if="isLoading" :style="getStyle"></base-spinner>
        <div v-else class="flex flex-col mt-8" ref="tab1">
          <div class="flex flex-row flex-wrap items-center px-8" :class="{ invalid: !type.isValid }">
            <label for="type" class="w-1/4 text-sm flex-shrink-0 mb-0">Type</label>
            <div class="w-3/4">
              <select class="ht-42" v-model.trim="type.val" @blur="clearValidity('type')">
                <option v-if="isShowPayIn" value="payin">PAYIN</option>
                <option v-if="isShowPayOut" value="payout">PAYOUT</option>
                <option v-if="isShowPayOut" value="payout_link">PAYOUT LINK</option>
              </select>
            </div>
            <div class="w-1/4"></div>
            <div class="w-3/4">
              <transition name="form-fade" mode="out-in">
                <p v-if="!type.isValid" class="h-4 text-xs text-red-600 ml-1">
                  {{ type.msg }}
                </p>
              </transition>
            </div>
          </div>
          <div class="flex flex-col">
            <div class="flex flex-row flex-wrap items-center px-8 mt-8" :class="{ invalid: !selectedAgent.isValid }">
              <label for="payoutAmount" class="w-1/4 text-sm flex-shrink-0 mb-0">Agent*</label>
              <div class="w-3/4">
                <select v-model.trim="selectedAgent.val" @blur="clearValidity('selectedAgent')" id="selectedAgent">
                  <option value="">Select an agent</option>
                  <option v-for="(agent, index) in agentList" :key="index" :value="agent.username">{{ agent.username }}
                  </option>
                </select>
              </div>
              <div class="w-1/4"></div>
              <div class="w-3/4">
                <transition name="form-fade" mode="out-in">
                  <p v-if="!selectedAgent.isValid" class="h-4 text-xs text-red-600 ml-1">
                    {{ selectedAgent.msg }}
                  </p>
                </transition>
              </div>
            </div>
          </div>
          <div v-if="type.val == 'payout'" class="flex flex-col">

            <div class="flex flex-row flex-wrap items-center px-8 mt-8" :class="{ invalid: !payoutAmount.isValid }">
              <label for="payoutAmount" class="w-1/4 text-sm flex-shrink-0 mb-0">Amount*</label>
              <div class="w-3/4">
                <input type="text" placeholder="Amount" v-model.trim="payoutAmount.val"
                  @blur="clearValidity('payoutAmount')" id="payoutAmount" @keypress="allowNumbersOnly">
              </div>
              <div class="w-1/4"></div>
              <div class="w-3/4">
                <transition name="form-fade" mode="out-in">
                  <p v-if="!payoutAmount.isValid" class="h-4 text-xs text-red-600 ml-1">
                    {{ payoutAmount.msg }}
                  </p>
                </transition>
              </div>
            </div>

            <div class="flex flex-row flex-wrap items-center px-8 mt-8" :class="{ invalid: !accountNumber.isValid }">
              <label for="accountNumber" class="w-1/4 text-sm flex-shrink-0 mb-0">Account Number*</label>
              <div class="w-3/4">
                <input type="text" placeholder="accountNumber" v-model.trim="accountNumber.val"
                  @blur="clearValidity('accountNumber')" id="accountNumber">
              </div>
              <div class="w-1/4"></div>
              <div class="w-3/4">
                <transition name="form-fade" mode="out-in">
                  <p v-if="!accountNumber.isValid" class="h-4 text-xs text-red-600 ml-1">
                    {{ accountNumber.msg }}
                  </p>
                </transition>
              </div>
            </div>

            <div class="flex flex-row flex-wrap items-center px-8 mt-8" :class="{ invalid: !ifsc.isValid }">
              <label for="ifsc" class="w-1/4 text-sm flex-shrink-0 mb-0">IFSC*</label>
              <div class="w-3/4">
                <input type="text" placeholder="ifsc" v-model.trim="ifsc.val" @blur="clearValidity('ifsc')" id="ifsc">
              </div>
              <div class="w-1/4"></div>
              <div class="w-3/4">
                <transition name="form-fade" mode="out-in">
                  <p v-if="!ifsc.isValid" class="h-4 text-xs text-red-600 ml-1">
                    {{ ifsc.msg }}
                  </p>
                </transition>
              </div>
            </div>

            <div class="flex flex-row flex-wrap items-center px-8 mt-8" :class="{ invalid: !bankName.isValid }">
              <label for="bankName" class="w-1/4 text-sm flex-shrink-0 mb-0">Bank Name*</label>
              <div class="w-3/4">
                <input type="text" placeholder="bankName" v-model.trim="bankName.val" @blur="clearValidity('bankName')"
                  id="bankName">
              </div>
              <div class="w-1/4"></div>
              <div class="w-3/4">
                <transition name="form-fade" mode="out-in">
                  <p v-if="!bankName.isValid" class="h-4 text-xs text-red-600 ml-1">
                    {{ bankName.msg }}
                  </p>
                </transition>
              </div>
            </div>

          </div>
          <div class="flex justify-between mt-4 mx-8">
            <div @click.stop="closeCreateOrderModal"
              class="border-2 font-medium border-red-600 text-red-600 hover:text-white bg-white hover:bg-red-600 rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">
              Cancel</div>
            <div @click.stop="submitCreateOrder"
              class="border-2 font-medium border-green-600 text-white hover:text-green-600 bg-green-600 hover:bg-white rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">
              Create</div>
          </div>
        </div>
      </base-modal>
    </transition>

  </div>
</template>

<script>
import ManualOrderItem from "../../components/manual-order/ManualOrderItem.vue";
import http from "../../http-common";
import io from "socket.io-client";
import Pagination from "../../components/shared/pagination.vue";

export default {
  name: "manual-order",
  components: {
    ManualOrderItem,
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
      createOrderModal: false,
      type: {
        val: "payin",
        isValid: true,
        msg: "",
      },
      payoutAmount: {
        val: null,
        isValid: true,
        msg: "",
      },
      selectedAgent: {
        val: "",
        isValid: true,
        msg: "",
      },
      accountNumber: {
        val: "",
        isValid: true,
        msg: "",
      },
      ifsc: {
        val: "",
        isValid: true,
        msg: "",
      },
      bankName: {
        val: "",
        isValid: true,
        msg: "",
      },
      clientName: "",
      formIsValid: true,
      agentList: [],
      advanceSearch: false,
      isDepositLinkCopied: false,
    };
  },
  watch: {
    isDepositLinkCopied(newVal) {
      if (newVal) {
        setTimeout(() => {
          this.isDepositLinkCopied = false;
        }, 200)
      }
    },
    first() {
      this.getManualOrderList();
    },
    page() {
      this.getManualOrderList();
    },
    showSearch(newVal) {
      if (!newVal) {
        this.getManualOrderList();
      }
    },
    searchKeyWord() {
      this.page = 1;
      this.getManualOrderList();
    },
    amount() {
      this.page = 1;
      this.getManualOrderList();
    },
    paymentStatus() {
      this.page = 1;
      this.getManualOrderList();
    },
    validatorUsername() {
      this.page = 1;
      this.getManualOrderList();
    },
    startDate(newVal) {
      if (this.endDate || newVal == "") {
        this.page = 1;
        this.getManualOrderList();
      }
    },
    endDate(newVal) {
      if (this.startDate || newVal == "") {
        this.page = 1;
        this.getManualOrderList();
      }
    },
    'type.val': function (newVal) {
      this.selectedAgent.val = "";
      this.selectedAgent.isValid = true;
      this.selectedAgent.msg = "";
      this.getAgents(newVal);
    },
    advanceSearch() {
      if (this.searchKeyWord != '') {
        this.page = 1;
        this.getManualOrderList();
      }
    },
  },
  computed: {
    getDepositLink() {
      return `${process.env.VUE_APP_BASE_URL}/#/deposit/${this.username}`;
    },
    isOrderCreator() {
      if (this.$store.getters.isOrderCreator) {
        return true;
      } else {
        return false;
      }
    },
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
    filteredPayOutList() {
      return this.$store.getters["payin/payInList"];
    },
    hasPayOutList() {
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
    getStyle() {
      const divElement = this.$refs.tab1;
      if (divElement) {
        const divHeight = divElement.clientHeight;
        return `height: ${divHeight}px;`;
      } else {
        return "height: 272px;";
      }
    },
    isShowPayIn() {
      if (this.isOrderCreator) {
        if (this.$store.getters.payInStatus == "0") {
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    },
    isShowPayOut() {
      if (this.isOrderCreator) {
        if (this.$store.getters.payOutStatus == "0") {
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
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

    this.getClientName();
    this.getManualOrderList();

    // if (this.isShowPayOut) {

    // }

    if (this.isShowPayIn) {
      this.type.val = 'payin';
      this.getAgents('payin');
    } else {
      if (this.isShowPayOut) {
        this.type.val = 'payout';
        this.getAgents('payout');
      }
    }

    // Bind event handlers here
    this.socket.on(`${this.vendor}-payout-order-created`, (data) => {
      this.addOrderToPayOutList(data);
    });
    this.socket.on(`${this.vendor}-order-created-with-common-link-${this.username}`, (data) => {
      this.addOrderToPayOutList(data);
    });
    this.socket.on(`${this.vendor}-order-amount-created-${this.username}`, (data) => {
      this.updateAmountAndStatus(data);
    });
    this.socket.on(`${this.vendor}-payout-order-amount-created-${this.username}`, (data) => {
      this.updatePayOutAmountAndStatus(data);
    });
    this.socket.on(`${this.vendor}-order-update-status-and-trnx`, (data) => {
      this.updateStatusAndTransaction(data);
    });
    this.socket.on(`${this.vendor}-payout-order-update-status-and-trnx`, (data) => {
      this.updateStatusAndTransaction(data);
    });
    this.socket.on("order-approved-auto", (data) => {
      this.autoOrderApproved(data);
    });
  },
  methods: {
    copyToClipBoardDepositLink() {
      navigator.clipboard.writeText(this.getDepositLink);
      this.isDepositLinkCopied = true;
    },
    async getAgents(type) {
      if (type === 'payout_link') {
        type = 'payout';
      }
      try {
        const response = await http.get(`/order-creator/getAgents?type=${type}`);

        if (response.status == 200) {
          this.agentList = response.data;
        }
      } catch (error) {
        console.log(error);
      }
    },
    allowNumbersOnly(event) {
      const charCode = event.which || event.keyCode;
      if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        event.preventDefault();
      }
    },
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
    autoOrderApproved(data) {
      this.$store.commit("payin/setPaymentStatusAndUtr", data);
    },
    addOrderToPayOutList(data) {
      if (!this.showSearch && this.page == 1 && data.type == "payout") {
        this.$store.commit("payin/addOrderToPayInList", data);
      }
    },
    updateAmountAndStatus(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updateAmountAndStatus", data);
      }
    },
    updatePayOutAmountAndStatus(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updatePayOutAmountAndStatus", data);
      }
    },
    updateStatusAndTransaction(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updateStatusAndTransaction", data);
      }
    },
    async getClientName() {
      try {
        const response = await http.get("/clients/getClientName");

        if (response.status == 200) {
          this.clientName = response.data.clients[0].clientName;
        }
      } catch (error) {
        console.log(error);
      }
    },
    async getManualOrderList() {
      const params = {
        type: "",
        searchKeyWord: this.searchKeyWord,
        amount: this.amount,
        paymentStatus: this.paymentStatus,
        validatorUsername: this.validatorUsername,
        startDate: this.startDate,
        endDate: this.endDate,
        first: this.first,
        page: this.page,
        transactionType: "manual",
        created_by: this.username,
        advanceSearch: this.advanceSearch,
      };
      this.isLoading = true;
      try {
        await this.$store.dispatch("payin/getPayInList", params);
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
    openCreateOrderModal() {
      this.createOrderModal = true;
    },
    closeCreateOrderModal() {
      this.createOrderModal = false;

      if (this.isShowPayIn) {
        this.type.val = 'payin';
      } else {
        if (this.isShowPayOut) {
          this.type.val = 'payout';
        }
      }
      this.type.isValid = true;
      this.type.msg = "";

      this.payoutAmount.val = null;
      this.payoutAmount.isValid = true;
      this.payoutAmount.msg = "";

      this.selectedAgent.val = "";
      this.selectedAgent.isValid = true;
      this.selectedAgent.msg = "";

      this.accountNumber.val = "";
      this.accountNumber.isValid = true;
      this.accountNumber.msg = "";

      this.ifsc.val = "";
      this.ifsc.isValid = true;
      this.ifsc.msg = "";

      this.bankName.val = "";
      this.bankName.isValid = true;
      this.bankName.msg = "";
    },
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;

      if (this.selectedAgent.val === "") {
        this.selectedAgent.isValid = false;
        this.selectedAgent.msg = "You must select an agent.";
        this.formIsValid = false;
      }

      if (this.type.val == 'payout') {
        if (this.payoutAmount.val === null) {
          this.payoutAmount.isValid = false;
          this.payoutAmount.msg = "Amount must not be empty.";
          this.formIsValid = false;
        }
        if (this.accountNumber.val === "") {
          this.accountNumber.isValid = false;
          this.accountNumber.msg = "Account Number must not be empty.";
          this.formIsValid = false;
        }
        if (this.ifsc.val === "") {
          this.ifsc.isValid = false;
          this.ifsc.msg = "IFSC must not be empty.";
          this.formIsValid = false;
        }
        if (this.bankName.val === "") {
          this.bankName.isValid = false;
          this.bankName.msg = "Bank Name must not be empty.";
          this.formIsValid = false;
        }
      }

    },
    reloadPage() {
      this.getManualOrderList();
    },
    async submitCreateOrder() {
      this.validateForm();

      if (!this.formIsValid) {
        return;
      }

      this.isLoading = true;

      let orderType = this.type.val;
      let isPayoutLink = false;
      if (orderType == 'payout_link') {
        orderType = 'payout';
        isPayoutLink = true;
      }

      const formData = {
        type: orderType,
        selectedAgent: this.selectedAgent.val,
        amount: parseInt(this.payoutAmount.val),
        accountNumber: this.accountNumber.val,
        ifsc: this.ifsc.val,
        bankName: this.bankName.val,
        isPayoutLink: isPayoutLink,
      }

      let url = `/orders/${this.vendor}/createPayOutOrder`;
      try {
        const response = await http.post(url, formData);
        if (response.status == 201) {
          this.closeCreateOrderModal();
          this.baseToast.type = "success";
          this.baseToast.message = response.data.message;
          setTimeout(() => {
            this.handleBaseToast();
            this.getManualOrderList();
          }, 1000);
        } else if (response.status == 400) {

          this.$swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: "No validators available. Please try again later!",
          }).then((result) => {
            if (result.value || result.dismiss) {
              this.closeCreateOrderModal();
            }
          })

        }
      } catch (error) {
        this.$swal.fire({
          icon: 'error',
          title: error.code,
          text: "No validators available. Please try again later!",
        }).then((result) => {
          if (result.value || result.dismiss) {
            this.closeCreateOrderModal();
          }
        })
      }

      this.isLoading = false;

    },
    handleBaseToast() {
      this.baseToast = {
        type: "",
        message: "",
      };
    },
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  },
};
</script>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.form-fade-enter-active,
.form-fade-leave-active {
  transition: all 0.5s ease;
}

.form-fade-enter-from,
.form-fade-leave-to {
  opacity: 0;
  height: 0px;
}

.ht-42 {
  height: 42px;
}
</style>

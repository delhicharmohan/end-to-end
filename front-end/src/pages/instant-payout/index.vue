<template>
  <div class="h-full flex flex-col p-4">
    <base-dialog :show="!!error" title="An error occurred!" @close="handleError">
      <p>{{ error }}</p>
    </base-dialog>
    <base-toast v-if="!!baseToast.message" :message="baseToast.message" :type="baseToast.type"
      @close="handleBaseToast"></base-toast>
    <section key="2" class="h-full flex flex-col">
      <base-card class="h-full flex flex-col">
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
            <base-button mode="outline" @click.stop="extractBtnClicked">Extract</base-button>
          </div>
          <div class="flex justify-start">
            <!-- <base-button v-if="isUser" class="mr-4" mode="outline" @click.stop="openCreatePayOutOrderModal"
              >Create Pay Out Order</base-button
            > -->
            <base-button v-if="!showSearch" mode="outline" @click.stop="searchBtnClicked">Search</base-button>
            <base-button v-else @click.stop="cancelBtnClicked">Cancel</base-button>
          </div>
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
              <input type="date" id="startDate" v-model.trim="endDate" />
            </div>
          </div>
        </div>

        <div class="flex px-4 my-4">
          <div class="flex justify-start items-center">
            <input id="select-all" class="cursor-pointer" type="checkbox" v-model="selectAll" />
            <label for="select-all" class="ml-2 mb-0 cursor-pointer">{{ selectAll ? 'Unselect All' : 'Select All'
              }}</label>
          </div>
        </div>

        <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
        <div v-else-if="hasPayOutList && !isLoading" class="flex-auto flex flex-col mt-4 overflow-y-auto px-4 mb-4">
          <div class="grid grid-cols-1 gap-4">
            <pay-out-item v-for="(item, index) in filteredPayOutList" :key="index" :item="item"
              :sl-no="paginatorInfo.firstItem + index" :select-all="selectAll" :clear-selected="clearSelected"
              @select-item="selectItem"></pay-out-item>
          </div>
          <div class="mt-4 flex-auto flex flex-col justify-end">
            <pagination :paginatorInfo="paginatorInfo" :setPage="setPage"></pagination>
          </div>
        </div>
        <h3 v-else
          class="text-center font-medium flex-auto flex flex-col justify-center items-center text-base sm:text-xl">
          No Pay Out transactions found!
        </h3>
      </base-card>
    </section>

    <transition name="fade" mode="out-in">
      <base-modal v-if="showPopUp" title="Extract Pay Out Orders" @close="closePopUp">
        <div class="flex flex-col">
          <div class="flex items-center mt-8 px-8">
            <label for="note" class="text-sm flex-shrink-0 mb-0 mr-4">Select the bank</label>
            <select v-model.trim="extractBank">
              <option value="">Select an option</option>
              <option value="kotak">Kotak</option>
              <option value="idfc">IDFC</option>
            </select>
          </div>
          <div class="flex justify-between mt-4 mx-8">
            <div @click.stop="closePopUp"
              class="border-2 font-medium border-red-600 text-red-600 hover:text-white bg-white hover:bg-red-600 rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">
              Cancel</div>
            <div @click.stop="generateExtract"
              class="border-2 font-medium border-green-600 text-white hover:text-green-600 bg-green-600 hover:bg-white rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">
              Generate</div>
          </div>
        </div>
      </base-modal>
    </transition>

    <transition name="fade" mode="out-in">
      <base-modal v-if="createPayOutOrderModal" title="Create Pay Out Order" @close="closeCreatePayOutOrderModal">
        <base-spinner v-if="isLoading" :style="getStyle"></base-spinner>
        <div v-else class="flex flex-col mt-8" ref="tab1">
          <div class="flex flex-row flex-wrap items-center px-8" :class="{ invalid: !accountNumber.isValid }">
            <label for="accountNumber" class="w-1/4 text-sm flex-shrink-0 mb-0">Account Number</label>
            <div class="w-3/4">
              <input type="text" v-model.trim="accountNumber.val" @blur="clearValidity('accountNumber')">
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
          <div class="flex flex-row flex-wrap items-center mt-4 px-8" :class="{ invalid: !ifsc.isValid }">
            <label for="ifsc" class="w-1/4 text-sm flex-shrink-0 mb-0">IFSC</label>
            <div class="w-3/4">
              <input type="text" v-model.trim="ifsc.val" @blur="clearValidity('ifsc')">
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
          <div class="flex flex-row flex-wrap items-center mt-4 px-8" :class="{ invalid: !bankName.isValid }">
            <label for="bankName" class="w-1/4 text-sm flex-shrink-0 mb-0">Bank Name</label>
            <div class="w-3/4">
              <input type="text" v-model.trim="bankName.val" @blur="clearValidity('bankName')">
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
          <div class="flex flex-row flex-wrap items-center mt-4 px-8" :class="{ invalid: !payoutAmount.isValid }">
            <label for="payoutAmount" class="w-1/4 text-sm flex-shrink-0 mb-0">Amount</label>
            <div class="w-3/4">
              <input type="text" v-model.trim="payoutAmount.val" @blur="clearValidity('payoutAmount')">
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
          <div class="flex justify-between mt-4 mx-8">
            <div @click.stop="closeCreatePayOutOrderModal"
              class="border-2 font-medium border-red-600 text-red-600 hover:text-white bg-white hover:bg-red-600 rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">
              Cancel</div>
            <div @click.stop="submitCreatePayOutOrder"
              class="border-2 font-medium border-green-600 text-white hover:text-green-600 bg-green-600 hover:bg-white rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">
              Create</div>
          </div>
        </div>
      </base-modal>
    </transition>

  </div>
</template>

<script>
import PayOutItem from "../../components/payout/PayOutItem.vue";
import http from "../../http-common";
import io from "socket.io-client";
import Pagination from "../../components/shared/pagination.vue";
import xlsx from "xlsx/dist/xlsx.full.min.js";

export default {
  name: "pay-in",
  components: {
    PayOutItem,
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
      selectedOrders: [],
      selectAll: false,
      showPopUp: false,
      extractBank: "",
      clearSelected: new Date().toISOString(),
      createPayOutOrderModal: false,
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
      payoutAmount: {
        val: "",
        isValid: true,
        msg: "",
      },
      formIsValid: true,
    };
  },
  watch: {
    first() {
      this.selectAll = false;
      this.getPayOutList();
    },
    page() {
      this.selectAll = false;
      this.getPayOutList();
    },
    showSearch(newVal) {
      if (newVal) {
        const currentDate = new Date().toISOString().split('T')[0];
        this.startDate = this.endDate = currentDate;
      }
      if (!newVal) {
        this.startDate = this.endDate = "";
        this.getPayOutList();
      }
    },
    advanceSearch() {
      if (this.searchKeyWord != '') {
        this.selectAll = false;
        this.page = 1;
        this.getPayOutList();
      }
    },
    searchKeyWord() {
      this.selectAll = false;
      this.page = 1;
      this.getPayOutList();
    },
    amount() {
      this.selectAll = false;
      this.page = 1;
      this.getPayOutList();
    },
    paymentStatus() {
      this.selectAll = false;
      this.page = 1;
      this.getPayOutList();
    },
    validatorUsername() {
      this.selectAll = false;
      this.page = 1;
      this.getPayOutList();
    },
    startDate(newVal) {
      if (this.endDate || newVal == "") {
        this.selectAll = false;
        this.page = 1;
        this.getPayOutList();
      }
    },
    endDate(newVal) {
      if (this.startDate || newVal == "") {
        this.selectAll = false;
        this.page = 1;
        this.getPayOutList();
      }
    },
    selectAll(newVal) {
      this.selectedOrders = [];
      if (newVal) {
        this.filteredPayOutList.forEach((row) => {
          this.selectedOrders.push(row);
        });
      }
    }
  },
  computed: {
    isUser() {
      if (this.$store.getters.isUser) {
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

    this.getPayOutList();
    this.getUsersWithRole();

    // Bind event handlers here
    if (this.role == "admin" || this.role == "subadmin") {
      this.socket.on(`${this.vendor}-instant-payout-order-created`, (data) => {
        this.addOrderToPayOutList(data);
      });

      this.socket.on(`${this.vendor}-instant-payout-order-updated`, (data) => {
        this.updateOrderToPayOutList(data);
      });

      this.socket.on(`${this.vendor}-instant-payout-order-amount-created`, (data) => {
        this.updatePayOutAmountAndStatus(data);
      });
    } else {
      this.socket.on(`${this.vendor}-instant-payout-order-created-${this.username}`, (data) => {
        this.addOrderToPayOutList(data);
      });

      this.socket.on(`${this.vendor}-instant-payout-order-updated-${this.username}`, (data) => {
        this.updateOrderToPayOutList(data);
      });

      this.socket.on(`${this.vendor}-instant-payout-order-amount-created-${this.username}`, (data) => {
        this.updatePayOutAmountAndStatus(data);
      });
    }
    this.socket.on(`${this.vendor}-instant-payout-order-update-status-and-trnx`, (data) => {
      this.updateStatusAndTransaction(data);
    });
    this.socket.on(`${this.vendor}-instant-update-payout-link-order`, (data) => {
      this.updatePayoutLinkOrder(data);
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
    autoOrderApproved(data) {
      this.$store.commit("payin/setPaymentStatusAndUtr", data);
    },
    addOrderToPayOutList(data) {
      if (!this.showSearch && this.page == 1 && data.type == "payout") {
        this.$store.commit("payin/addOrderToPayInList", data);
      }
    },

    updateOrderToPayOutList(data) {
      if (!this.showSearch && this.page == 1 && data.type == "payout") {
        this.$store.commit("payin/updateOrderToPayOutList", data);
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
    updatePayoutLinkOrder(data) {
      if (!this.showSearch) {
        this.$store.commit("payin/updatePayoutLinkOrder", data);
      }
    },
    async getPayOutList() {
      const params = {
        type: "payout",
        payoutType: 'instant',
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
    extractBtnClicked() {
      if (this.selectedOrders.length > 0) {
        this.showPopUp = true;
      } else {
        let error_msg = "You must select at least 1 order!"
        this.$swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error_msg,
        }).then((result) => {
          if (result.value || result.dismiss) {
            error_msg = null
          }
        })
      }
    },
    closePopUp() {
      this.showPopUp = false;
    },
    generateExtract() {
      if (this.extractBank == "") {
        let error_msg = "You must select a bank!"
        this.$swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error_msg,
        }).then((result) => {
          if (result.value || result.dismiss) {
            error_msg = null
          }
        })
      } else {

        if (this.extractBank == "kotak") {

          let extractData = [];

          this.selectedOrders.forEach((order) => {

            const updatedAt = "2023-12-03T18:39:18.000Z";
            const date = new Date(updatedAt);
            const Payment_Date = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;

            const obj = {
              Client_Code: "",
              Product_Code: "",
              Payment_Type: "",
              Payment_Ref_No: order.refID,
              Payment_Date: Payment_Date,
              Instrument_Date: "",
              Dr_Ac_No: "",
              Amount: order.amount,
              Bank_Code_Indicator: "",
              Beneficiary_Code: "",
              Beneficiary_Name: order.customerName,
              Beneficiary_Bank: order.bankName,
              Beneficiary_Branch_OR_IFSC_Code: order.ifsc,
              Beneficiary_Acc_No: order.accountNumber,
              Location: "",
              Print_Location: "",
              Instrument_Number: "",
              Ben_Add1: "",
              Ben_Add2: "",
              Ben_Add3: "",
              Ben_Add4: "",
              Beneficiary_Email: "",
              Beneficiary_Mobile: order.customerMobile,
              Debit_Narration: "",
              Credit_Narration: "",
              Payment_Details_1: "",
              Payment_Details_2: "",
              Payment_Details_3: "",
              Payment_Details_4: "",
              Enrichment_1: "",
              Enrichment_2: "",
              Enrichment_3: "",
              Enrichment_4: "",
              Enrichment_5: "",
              Enrichment_6: "",
              Enrichment_7: "",
              Enrichment_8: "",
              Enrichment_9: "",
              Enrichment_10: "",
              Enrichment_11: "",
              Enrichment_12: "",
              Enrichment_13: "",
              Enrichment_14: "",
              Enrichment_15: "",
              Enrichment_16: "",
              Enrichment_17: "",
              Enrichment_18: "",
              Enrichment_19: "",
              Enrichment_20: "",
            }

            extractData.push(obj);
          });

          const XLSX = xlsx;

          const header = [
            "Client_Code",
            "Product_Code",
            "Payment_Type",
            "Payment_Ref_No",
            "Payment_Date",
            "Instrument Date",
            "Dr_Ac_No",
            "Amount",
            "Bank_Code_Indicator",
            "Beneficiary_Code",
            "Beneficiary_Name",
            "Beneficiary_Bank",
            "Beneficiary_Branch / IFSC Code",
            "Beneficiary_Acc_No",
            "Location",
            "Print_Location",
            "Instrument_Number",
            "Ben_Add1",
            "Ben_Add2",
            "Ben_Add3",
            "Ben_Add4",
            "Beneficiary_Email",
            "Beneficiary_Mobile",
            "Debit_Narration",
            "Credit_Narration",
            "Payment Details 1",
            "Payment Details 2",
            "Payment Details 3",
            "Payment Details 4",
            "Enrichment_1",
            "Enrichment_2",
            "Enrichment_3",
            "Enrichment_4",
            "Enrichment_5",
            "Enrichment_6",
            "Enrichment_7",
            "Enrichment_8",
            "Enrichment_9",
            "Enrichment_10",
            "Enrichment_11",
            "Enrichment_12",
            "Enrichment_13",
            "Enrichment_14",
            "Enrichment_15",
            "Enrichment_16",
            "Enrichment_17",
            "Enrichment_18",
            "Enrichment_19",
            "Enrichment_20",
          ]

          const worksheet = XLSX.utils.json_to_sheet(extractData);

          worksheet["A1"] = { v: header[0], t: "s" }
          worksheet["B1"] = { v: header[1], t: "s" }
          worksheet["C1"] = { v: header[2], t: "s" }
          worksheet["D1"] = { v: header[3], t: "s" }
          worksheet["E1"] = { v: header[4], t: "s" }
          worksheet["F1"] = { v: header[5], t: "s" }
          worksheet["G1"] = { v: header[6], t: "s" }
          worksheet["H1"] = { v: header[7], t: "s" }
          worksheet["I1"] = { v: header[8], t: "s" }
          worksheet["J1"] = { v: header[9], t: "s" }
          worksheet["K1"] = { v: header[10], t: "s" }
          worksheet["L1"] = { v: header[11], t: "s" }
          worksheet["M1"] = { v: header[12], t: "s" }
          worksheet["N1"] = { v: header[13], t: "s" }
          worksheet["O1"] = { v: header[14], t: "s" }
          worksheet["P1"] = { v: header[15], t: "s" }
          worksheet["Q1"] = { v: header[16], t: "s" }
          worksheet["R1"] = { v: header[17], t: "s" }
          worksheet["S1"] = { v: header[18], t: "s" }
          worksheet["T1"] = { v: header[19], t: "s" }
          worksheet["U1"] = { v: header[20], t: "s" }
          worksheet["V1"] = { v: header[21], t: "s" }
          worksheet["W1"] = { v: header[22], t: "s" }
          worksheet["X1"] = { v: header[23], t: "s" }
          worksheet["Y1"] = { v: header[24], t: "s" }
          worksheet["Z1"] = { v: header[25], t: "s" }
          worksheet["AA1"] = { v: header[26], t: "s" }
          worksheet["AB1"] = { v: header[27], t: "s" }
          worksheet["AC1"] = { v: header[28], t: "s" }
          worksheet["AD1"] = { v: header[29], t: "s" }
          worksheet["AE1"] = { v: header[30], t: "s" }
          worksheet["AF1"] = { v: header[31], t: "s" }
          worksheet["AG1"] = { v: header[32], t: "s" }
          worksheet["AH1"] = { v: header[33], t: "s" }
          worksheet["AI1"] = { v: header[34], t: "s" }
          worksheet["AJ1"] = { v: header[35], t: "s" }
          worksheet["AK1"] = { v: header[36], t: "s" }
          worksheet["AL1"] = { v: header[37], t: "s" }
          worksheet["AM1"] = { v: header[38], t: "s" }
          worksheet["AN1"] = { v: header[39], t: "s" }
          worksheet["AO1"] = { v: header[40], t: "s" }
          worksheet["AP1"] = { v: header[41], t: "s" }
          worksheet["AQ1"] = { v: header[42], t: "s" }
          worksheet["AR1"] = { v: header[43], t: "s" }
          worksheet["AS1"] = { v: header[44], t: "s" }
          worksheet["AT1"] = { v: header[45], t: "s" }
          worksheet["AU1"] = { v: header[46], t: "s" }
          worksheet["AV1"] = { v: header[47], t: "s" }
          worksheet["AW1"] = { v: header[48], t: "s" }

          worksheet['!cols'] = [
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 40 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 30 },
            { width: 30 },
            { width: 40 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
          ]

          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
          XLSX.writeFile(workbook, `${this.extractBank}.xlsx`);
        } else if (this.extractBank == "idfc") {
          let extractData = [];

          this.selectedOrders.forEach((order) => {

            const updatedAt = "2023-12-03T18:39:18.000Z";
            const date = new Date(updatedAt);
            const Transaction_Date = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;

            const obj = {
              Beneficiary_Name: order.customerName,
              Beneficiary_Acc_No: order.accountNumber,
              IFSC: order.ifsc,
              Transaction_Type: "",
              Debit_Account_Number: "",
              Transaction_Date: Transaction_Date,
              Amount: order.amount,
              Currency: "INR",
              Beneficiary_Email_ID: "",
              Remarks: "",
              Custom_Header_1: "",
              Custom_Header_2: "",
              Custom_Header_3: "",
              Custom_Header_4: "",
              Custom_Header_5: "",
            }

            extractData.push(obj);
          });

          const XLSX = xlsx;

          const header = [
            "Beneficiary Name",
            "Beneficiary Account Number",
            "IFSC",
            "Transaction Type",
            "Debit Account Number",
            "Transaction Date",
            "Amount",
            "Currency",
            "Beneficiary Email ID",
            "Remarks",
            "Custom Header-1",
            "Custom Header-2",
            "Custom Header-3",
            "Custom Header-4",
            "Custom Header-5",
          ]

          const worksheet = XLSX.utils.json_to_sheet(extractData);

          worksheet["A1"] = { v: header[0], t: "s" }
          worksheet["B1"] = { v: header[1], t: "s" }
          worksheet["C1"] = { v: header[2], t: "s" }
          worksheet["D1"] = { v: header[3], t: "s" }
          worksheet["E1"] = { v: header[4], t: "s" }
          worksheet["F1"] = { v: header[5], t: "s" }
          worksheet["G1"] = { v: header[6], t: "s" }
          worksheet["H1"] = { v: header[7], t: "s" }
          worksheet["I1"] = { v: header[8], t: "s" }
          worksheet["J1"] = { v: header[9], t: "s" }
          worksheet["K1"] = { v: header[10], t: "s" }
          worksheet["L1"] = { v: header[11], t: "s" }
          worksheet["M1"] = { v: header[12], t: "s" }
          worksheet["N1"] = { v: header[13], t: "s" }
          worksheet["O1"] = { v: header[14], t: "s" }

          worksheet['!cols'] = [
            { width: 30 },
            { width: 30 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
            { width: 20 },
          ]

          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
          XLSX.writeFile(workbook, `${this.extractBank}.xlsx`);
        }

        this.showPopUp = false;
        this.extractBank = "";
        this.selectAll = false;
        this.clearSelected = new Date().toISOString();
      }
    },
    selectItem(refID, isSelected) {
      if (isSelected) {
        const selectedOrder = this.filteredPayOutList.find(order => order.refID === refID);
        this.selectedOrders.push(selectedOrder);
      } else {
        const index = this.selectedOrders.findIndex(order => order.refID === refID);
        if (index !== -1) {
          this.selectedOrders.splice(index, 1);
        }
      }
    },
    openCreatePayOutOrderModal() {
      this.createPayOutOrderModal = true;
    },
    closeCreatePayOutOrderModal() {
      this.createPayOutOrderModal = false;
      this.accountNumber.val = "";
      this.accountNumber.isValid = true;
      this.accountNumber.msg = "";

      this.ifsc.val = "";
      this.ifsc.isValid = true;
      this.ifsc.msg = "";

      this.bankName.val = "";
      this.bankName.isValid = true;
      this.bankName.msg = "";

      this.payoutAmount.val = "";
      this.payoutAmount.isValid = true;
      this.payoutAmount.msg = "";
    },
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;

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
      if (this.payoutAmount.val === "") {
        this.payoutAmount.isValid = false;
        this.payoutAmount.msg = "Amount must not be empty.";
        this.formIsValid = false;
      } else {
        const numberRegex = /^-?\d+(\.\d+)?$/;
        const isInteger = numberRegex.test(this.payoutAmount.val);
        if (!isInteger) {
          this.payoutAmount.isValid = false;
          this.payoutAmount.msg = "Please enter a valid amount.";
          this.formIsValid = false;
        } else {
          if (this.payoutAmount.val <= 0) {
            this.payoutAmount.isValid = false;
            this.payoutAmount.msg = "The amount should be greater than zero.";
            this.formIsValid = false;
          }
        }
      }

    },
    async submitCreatePayOutOrder() {
      this.validateForm();

      if (!this.formIsValid) {
        return;
      }

      this.isLoading = true;

      const formData = {
        accountNumber: this.accountNumber.val,
        ifsc: this.ifsc.val,
        bankName: this.bankName.val,
        amount: parseFloat(this.payoutAmount.val),
      }

      let url = `/orders/${this.vendor}/createPayOutOrder`;
      try {
        const response = await http.post(url, formData);
        if (response.status == 201) {
          this.closeCreatePayOutOrderModal();
          this.baseToast.type = "success";
          this.baseToast.message = response.data.message;
          setTimeout(() => {
            this.handleBaseToast();
            // this.getPayOutList();
          }, 1000);
        }
      } catch (error) {
        console.log(error);
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
</style>

<template>


  <section v-if="isCustomerUPIID" @contextmenu.prevent
    class="min-h-screen w-full flex flex-col bg-blue-50 justify-center items-center px-4 sm:px-6 py-8 relative overflow-hidden">

    <!-- Decorative elements removed for solid background -->

    <!-- Success Toast -->
    <div class="success-message fixed z-50 top-4 right-4 transform transition-all duration-300 ease-out" 
         v-if="isVisible"
         :class="isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'">
      <div class="flex items-center bg-green-600 text-white rounded-xl p-4 shadow-2xl border border-green-700">
        <span class="icon mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
        </span>
        <span class="text font-medium">{{ message }}</span>
      </div>
    </div>

    <!-- Alert Toast -->
    <div class="alert-message fixed z-50 top-4 right-4 transform transition-all duration-300 ease-out" 
         v-if="alertVisible"
         :class="alertVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'">
      <div class="flex items-center bg-orange-600 text-white rounded-xl p-4 shadow-2xl border border-orange-700">
        <span class="icon mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle"
            viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
            <path
              d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
          </svg>
        </span>
        <span class="text font-medium">{{ message }}</span>
      </div>
    </div>


    <base-dialog :show="!!error" title="An error occurred!" @close="closeTheDialogBox">
      <p>{{ error }}</p>
    </base-dialog>
    <div class="w-full max-w-md relative group">
      <!-- Solid Card -->
      <div class="bg-blue-700 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        
        <!-- Overlays removed -->
        <div class="hidden">
          <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 20px 20px;"></div>
        </div>
        
        <!-- Content -->
        <div class="relative z-10">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.314-.488-1.314-1.314 0-.725.589-1.314 1.314-1.314.725 0 1.314.589 1.314 1.314 0 .725-.589 1.314-1.314 1.314z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold mb-2 text-white">Processing Your Withdrawal</h1>
            <p class="text-blue-100 text-sm leading-relaxed">Please wait while we process your payment in Minutes</p>
            <div class="mt-3">
              <vue-countdown
                class="text-2xl font-bold text-white tracking-wider bg-blue-600 px-4 py-2 rounded-full"
                :time="countDownLimit"
                @start="countDownStarted" 
                @progress="onCountdownProgress" 
                @end="countDownEnd" 
                v-slot="{ minutes, seconds }">
                {{ minutes }}:{{ seconds }}
              </vue-countdown>
            </div>
          </div>

          <!-- Circular Progress Bar -->
          <div class="relative flex justify-center items-center mb-8">
            <svg class="w-32 h-32 progress-circle transform transition-transform duration-300 hover:scale-105" viewBox="0 0 36 36">
              <!-- Background Circle -->
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" stroke-width="2.5"></circle>

              <!-- Dynamic Progress Circle -->
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="white" stroke-width="2.5" stroke-dasharray="100"
                :stroke-dashoffset="calculateProgress()" class="transition-all duration-500 ease-out"></circle>
            </svg>

            <!-- Progress Text -->
            <div class="absolute text-center">
              <p class="text-4xl font-bold text-white drop-shadow-lg"> {{ completedPercentage.toFixed(0) }} %</p>
              <p class="text-sm text-blue-100 font-medium">Completed</p>
            </div>
          </div>





          <!-- Amount Details -->
          <div class="bg-blue-600 border border-blue-500 rounded-2xl p-6 mb-8">
            <div class="grid grid-cols-3 text-center gap-4">
              <div class="text-center">
                <p class="text-xs text-blue-100 font-medium mb-1">Requested</p>
                <p class="text-xl font-bold text-white">₹{{ amount }}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-blue-100 font-medium mb-1">Paid</p>
                <p class="text-xl font-bold text-green-300">₹{{ paid }}</p>
              </div>
              <div class="text-center">
                <p class="text-xs text-blue-100 font-medium mb-1">Balance</p>
                <p class="text-xl font-bold text-red-300">₹{{ balance }}</p>
              </div>
            </div>
          </div>



          <!-- Footer Message -->
          <div class="text-center text-sm text-blue-100 leading-relaxed">
            <p>Your withdrawal is being processed in batches. Please confirm once it reflects in your bank account. Your
              wallet will be reactivated shortly.</p>
          </div>
        </div>
      </div>


      <!-- Batch Transactions Section -->
      <div class="w-full max-w-md mt-8">
        <div class="bg-blue-700 border border-blue-600 rounded-3xl shadow-2xl p-6 text-white relative overflow-hidden">
          <!-- Gradient overlay removed -->
          
          <!-- Content -->
          <div class="relative z-10">
            <h2 class="text-xl font-bold text-white mb-6 text-center">Batch Transactions</h2>

            <div class="space-y-4">
              <!-- Empty State -->
              <div class="flex justify-center items-center py-8" v-if="pendingList.length == 0">
                <div class="text-center">
                  <div class="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-blue-200">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.314-.488-1.314-1.314 0-.725.589-1.314 1.314-1.314.725 0 1.314.589 1.314 1.314 0 .725-.589 1.314-1.314 1.314z" />
                    </svg>
                  </div>
                  <p class="text-sm text-blue-200">Instant credit will appear here.<br>Confirm once you receive in bank!</p>
                </div>
              </div>
              
              <!-- Transaction Items -->
              <div class="bg-blue-600 border border-blue-500 rounded-2xl p-4 hover:bg-blue-500 transition-all duration-300"
                v-for="(item, index) in pendingList" :key="index">
                <!-- Left Side -->
                <div class="flex justify-between items-center">
                  <div>
                    <p class="text-lg font-bold text-white">₹{{ item.amount }}</p>
                    <p class="text-xs text-blue-200">UTR: {{ item.utr_no }}</p>
                  </div>
                  <!-- Right Side -->
                  <div class="text-right">
                    <p class="text-xs text-blue-200 mb-2">{{ formatDate(item.system_confirmed_at) }}</p>
                    <a v-if="item.confirmed_by_customer_at == null" @click.stop="iConfirmPayment(item)"
                      class="inline-flex items-center px-4 py-2 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      I Confirm
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="h-full flex justify-center items-center" v-if="isLoading">
      <base-page-spinner-new type="spin" class-list="h-20"></base-page-spinner-new>
    </div>


  </section>


  <section v-else class="min-h-screen w-full flex flex-col bg-blue-50 justify-center items-center px-4 sm:px-6 py-8 relative overflow-hidden">
    <!-- Decorative gradient blobs removed for solid background -->

    <div v-if="orderData" class="w-full max-w-lg md:max-w-4xl relative group">
      <!-- Blue Card (solid) -->
      <div class="bg-blue-700 rounded-3xl shadow-2xl overflow-hidden">
        <!-- Solid background; overlay removed -->
        
        <!-- Content -->
        <div class="relative z-10 flex flex-col md:flex-row">
          <!-- Left Section -->
          <div class="flex-1 p-8 text-white">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.314-.488-1.314-1.314 0-.725.589-1.314 1.314-1.314.725 0 1.314.589 1.314 1.314 0 .725-.589 1.314-1.314 1.314z" />
              </svg>
            </div>

            <h2 class="text-2xl font-bold text-white mb-6">
              Instant Payout Request from {{ convertToUpperCase(orderData.vendor) }}
            </h2>

            <div class="space-y-6">
              <div class="bg-blue-600 rounded-2xl p-4 border border-blue-500">
                <p class="text-blue-100 text-sm font-semibold uppercase tracking-wide">PAYOUT MODE</p>
                <p class="text-white text-lg font-bold">UPI ID</p>
              </div>

              <div class="bg-blue-600 rounded-2xl p-4 border border-blue-500">
                <p class="text-emerald-100 text-sm font-semibold uppercase tracking-wide">AMOUNT PAYABLE</p>
                <p class="text-white text-2xl font-bold">₹{{ orderData.amount }}</p>
              </div>
            </div>
          </div>

          <!-- Right Section -->
          <div class="bg-blue-800 flex flex-col items-center justify-center p-8 md:w-96 text-white">
            <div class="w-20 h-20 bg-blue-700 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.314-.488-1.314-1.314 0-.725.589-1.314 1.314-1.314.725 0 1.314.589 1.314 1.314 0 .725-.589 1.314-1.314 1.314z" />
              </svg>
            </div>
            
            <h3 class="text-xl font-bold text-center mb-2">{{ convertToUpperCase(orderData.vendor) }}</h3>
            <p class="text-blue-100 text-sm mb-8 text-center">Total Amount: ₹{{ orderData.amount }}</p>

            <form class="w-full" @submit.prevent="submitForm">
              <label for="upiId" class="block text-blue-100 text-sm font-medium mb-2">Enter your UPI ID</label>

              <input
                id="upiId"
                type="text"
                v-model.trim="formCustomerUpiId.val"
                @blur="clearValidity('formCustomerUpiId')"
                placeholder="yourname@upi"
                class="w-full px-4 py-3 bg-blue-700 border border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white placeholder-blue-200 transition-all duration-300"
                required
              >

              <p class="text-[11px] text-blue-100/80 mt-2">Ensure your UPI ID is correct (e.g., user@bank).</p>
              <p v-if="!formIsValid" class="text-xs text-red-200 mt-1">{{ formCustomerUpiId.msg }}</p>
              
              <button
                type="submit"
                class="w-full mt-4 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 hover:shadow-lg transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                Proceed to Payout
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>

</template>

<script>
import io from "socket.io-client";
import http from "../../http-common.js";
import VueCountdown from "@chenfengyuan/vue-countdown";
import moment from 'moment-timezone';

export default {
  name: "pay",
  props: ["id"],
  components: {
    VueCountdown,
  },
  data() {
    return {
      isExpiateToAdmin: false,
      timezone: process.env.VUE_APP_TIMEZONE,
      instantPayoutExpiryTime: null,
      balanceProgress: 99.99,
      completedPercentage: 0.0,
      formIsValid: false,
      formCustomerUpiId: {
        val: "",
        isValid: true,
        msg: "",
      },
      isCustomerUPIID: false,
      isRedirectionSet: false,
      isTimeoutReached: false,
      total: 0.0,
      paid: 0.0,
      balance: 0.0,
      pendingList: [],
      orderData: null,
      countDownLimit: 1000 * 60 * 15,
      //checkingTimerLimit: 5000,
      checkingTimerLimit: 1000 * 30, // Reduced from 10 minutes to 30 seconds for faster matching
      isLoading: true,
      error: false,
      closeTheDialogBox: true,
      showForm: false,
      isVisible: false,
      alertVisible: false,
      message: "",
      intervalId: null,
      isCountingDown: false,
      amount: 0.0,
      isCompleted: false,
    };
  },
  watch: {

  },
  computed: {},
  created() {

    this.socket = io(process.env.VUE_APP_SOCKET_URL, {
      path: "/wizpay-socket-path",
    });
    // Handle events
    this.socket.on("connect", () => {
      console.log("Connected to server to serve!!!");
      this.loadPayOutOrder();
    });

    this.socket.on("disconnect", () => {
      //this.loadPayOutOrder();
      this.unLoadSocketConnection();
    });

    // Listen for user count updates
    this.socket.on("userCountUpdate", (count) => {
      console.log(`Current users listening to channel 'abc': ${count}`);
    });

    //this.markAsWaitingForPayment();
    this.loadPayOutOrder();
    //this.startTimerForReAssigning();


  },
  methods: {
    startTimerForReAssigning() {
      // Set a timeout to trigger the event after 30 seconds for faster matching
      setTimeout(() => {
        this.isTimeoutReached = true;
        // Event triggered
        this.findStatus();
      }, this.checkingTimerLimit); // 30 seconds for faster matching
    },
    //  having a  doubt why this method being used...
    async findStatus() {
      let url = `/orders/${this.id}/check-instant-payout-status`;
      const data = { apiType: "payment" };
      try {
        const response = await http.get(url, { params: data });
        console.log(response.data);
        // Only restart timer if not already completed
        if (!this.isCompleted) {
          this.startTimerForReAssigning();
        }
      } catch (e) {
        console.log(e);
      }
    },


    async loadPayOutOrder() {
      let url = `/orders/${this.id}/instant-payout`;
      try {
        const response = await http.get(url);

        if (response.status == 200) {

          let timeZoneTemp = process.env.VUE_APP_TIMEZONE;
          if (response.data.data.instant_payout_expiry_at != null) {
            this.instantPayoutExpiryTime = moment.tz(response.data.data.instant_payout_expiry_at, timeZoneTemp).valueOf();
            this.reCalculateCountDownTime();
          }
          if (response.data.data.customerUPIID == undefined || response.data.data.customerUPIID == '') {
            this.customerUPIID = false;
          } else {

            this.isCustomerUPIID = true;
            this.markAsWaitingForPayment();
            this.waitingForATimerExtension();
            // Immediate matching attempt for faster processing
            setTimeout(() => {
              this.findStatus();
            }, 2000); // Try matching after 2 seconds
            this.startTimerForReAssigning();
          }


          if (response.data.redirect) {
            this.orderData = response.data.data;
            this.message = response.data.message;
            this.isCompleted = true;
            this.showMessage();
            this.redirectToCreator();
          } else {
            this.orderData = response.data.data;
            this.amount = this.orderData.amount;
          }
        } else {

          if (response.data.customerUPIID == undefined || response.data.customerUPIID == '') {
            this.customerUPIID = false;
          }

          this.orderData = response.data.data;
          this.message = response.data.message;
          this.isCompleted = true;
          this.showMessage();
          this.redirectToCreator();
        }
      } catch (e) {
        console.log(e);
      }

      this.refreshPaymentStatus();
      setInterval(() => {
        this.refreshPaymentStatus();
      }, 1000 * 3); // Reduced from 10 seconds to 3 seconds for faster updates
    },


    waitingForATimerExtension() {
      this.isLoading = false;
      this.showForm = true;
      const room = `instant-withdraw-extension-${this.id}`;
      this.socket.emit("joinChannel", room); // Emit join event
      this.socket.on(room, (data) => {

        this.message = 'We are currently experiencing a high volume of payout requests. \n You may experience a slight delay in receiving your payment';
        this.showAlertMessage();

        if (data.instant_payout_expiry_at != null && data.is_payout_time_extended != null) {
          this.instantPayoutExpiryTime = moment.tz(data.instant_payout_expiry_at, this.timezone).valueOf();
          this.reCalculateCountDownTime();
        } else {
          console.log("else block!!1");
        }
      });
    },

    markAsWaitingForPayment() {
      this.isLoading = false;
      this.showForm = true;
      const room = `instant-withdraw-${this.id}`;
      this.socket.emit("joinChannel", room); // Emit join event
      this.socket.on(room, (data) => {
        console.log(data);
        let item = data;
        const uuidExists = this.pendingList.some(existingItem => existingItem.uuid === item.uuid);
        if (!uuidExists) {
          this.message = `Congratulations! your account is credited with Rs.${item.amount}`;
          this.showMessage();
          this.pendingList.push(item);
        } else {
          console.log("Item with this UUID already exists in pendingList.");
        }

        this.refreshPaymentStatus();
      });
    },




    // to be checked refresh payment status...

    async refreshPaymentStatus() {
      let url = `/orders/${this.id}/instant-payout-batches`;
      try {
        const response = await http.get(url);
        if (response.status == 200) {

          if (response.data.redirect) {
            this.redirectToCreator();
          }
          this.pendingList = response.data.data.batchItems;
          this.amount = response.data.data.total;
          this.paid = response.data.data.paid;
          this.balance = response.data.data.balance;
          if (response.data.data.expiate == true) {
            // expiate to admin as a request!!
            if (this.isExpiateToAdmin == false) {
              this.isExpiateToAdmin = true;
              this.findStatus();
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    },








    //  formatted & error free  methods



    // clearing the validity of the input // need to check do i need to comment the valid & status to activate or not from comments
    clearValidity(input) {
      console.log(input);
      //this[input].isValid = true;
      //this[input].msg = "";
    },

    // on count down ends.. // need to confirm whether this method has a valid context...
    async countDownEnd() {
      if (this.socket) {
        this.socket.disconnect();
      }
    },


    // submit form method used to update the user upi id at the beginning of the process

    async submitForm() {
      this.validateForm();
      if (!this.formIsValid) {
        return;
      }
      this.isLoading = true;
      try {
        const response = await http.post(`/orders/${this.id}/update-instant-payout`, {
          customerUPIID: this.formCustomerUpiId.val,
        });

        this.isLoading = false;
        if (response.status == 200) {
          this.loadPayOutOrder();
        } else {
          console.log("error!!!");
        }
      } catch (error) {
        console.log(error);
      }
    },

    // validate form this is used when user is about to enter their upi id method used to save the upi id before the order is being processed with system..

    validateForm() {
      this.formIsValid = true;

      if (this.formCustomerUpiId.val === '') {
        this.formCustomerUpiId.isValid = false;
        this.formCustomerUpiId.msg = 'You must enter UPI ID.';
        this.formIsValid = false;
      } else {
        const isValidUpiId = /^[\w.-]+@[\w.-]+$/.test(this.formCustomerUpiId.val);

        if (!isValidUpiId) {
          this.formCustomerUpiId.isValid = false;
          this.formCustomerUpiId.msg = "Please enter a valid UPI ID.";
          this.formIsValid = false;
        }
      }
    },

    // on count down progress need to check whether this method has a valid context or not..
    onCountdownProgress(event) {
      if (event.minutes == 0 && event.seconds >= 30) {
        // this.showTransactionBar = true;
      }
    },

    // unloading the socket connection and exit the instant payout
    async unLoadSocketConnection() {
      let url = `/orders/${this.id}/exit-instant-payout`;
      const data = { apiType: "payment" };
      try {
        const response = await http.get(url, { params: data });
        console.log(response.data);
      } catch (e) {
        console.log(e);
      }
    },


    // convert to uppercase
    convertToUpperCase(value) {
      return value.toUpperCase();
    },

    // re calculate the count down time
    reCalculateCountDownTime() {
      const now = moment.tz(this.timezone).valueOf();
      this.countDownLimit = this.instantPayoutExpiryTime - now;
      if (this.countDownLimit < 0) {
        this.countDownLimit = 0;
      }
    },


    // redirect to creator website
    redirectToCreator() {
      if (this.isRedirectionSet === false) {
        this.isRedirectionSet = true;
        setInterval(() => {
          window.location.href = this.orderData.returnUrl;
        }, 1000 * 15);
      }

    },

    // i confirm method (direct callback, no modal)
    async iConfirmPayment(item) {
      let now = new Date().toISOString();
      let url = `/orders/${this.id}/confirm-batch`;
      try {
        this.isLoading = true; // show spinner (no overlay)
        const body = { uuid: item.uuid };
        const response = await http.post(url, body);
        console.log(response.data);
        console.log(response);
        this.isLoading = false;

        if (response.status == 200) {
          if (response.data.redirect && response.data.withdrawalDetails) {
            localStorage.setItem('withdrawalSuccess', JSON.stringify(response.data.withdrawalDetails));
            this.$router.push('/instant-withdraw/success');
          } else {
            this.message = response.data.message;
            item.confirmed_by_customer_at = now;
            this.showMessage();
          }
        } else if (response.status == 206) {
          this.message = response.data.message;
          item.confirmed_by_customer_at = now;
          this.showMessage();
        } else {
          // Fallback error toast
          this.alertVisible = true;
          this.message = response.data?.message || 'An error occurred while processing your request';
          setTimeout(() => { this.alertVisible = false; }, 3000);
        }
      } catch (e) {
        this.isLoading = false;
        this.alertVisible = true;
        this.message = 'Network error. Please try again.';
        setTimeout(() => { this.alertVisible = false; }, 3000);
      }
    },

    //  for format Date to display

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
      const amPm = hours >= 12 ? "pm" : "am";
      const formattedDate = `${day}-${month}-${year} ${hours %
        12}:${minutes}:${seconds} ${amPm}`;
      return formattedDate;
    },

    // for alerts
    showAlertMessage() {
      this.alertVisible = true;
      setTimeout(() => {
        this.alertVisible = false;
      }, 10000);
    },

    // for messages
    showMessage() {
      this.isVisible = true;
      setTimeout(() => {
        this.isVisible = false;
      }, 3000);
    },

    // for calculating the progress
    calculateProgress() {
      let percentage = 0.0;
      if (this.paid == 0) {
        this.balanceProgress = 99.99;
        this.completedPercentage = 0;
      } else {
        percentage = Math.floor((this.paid / this.amount) * 100);
      }
      this.completedPercentage = percentage;
      this.balanceProgress = 100 - this.completedPercentage;
      return this.balanceProgress;
    },

  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    clearInterval(this.intervalId);
  },


  // count down start method..
  countDownStarted() {
    this.intervalId = setInterval(() => { }, 15000);
  },
};
</script>


<style>
.progress-circle {
  transform: rotate(-90deg);
  /* Rotate to start progress from the top */
  transform-origin: center;
  width: 128px;
  height: 128px;
}

/* Style for the Slider */
.progress-slider {
  margin-top: 20px;
  width: 100%;
}

/* Keyframes for the progress animation */
@keyframes fillProgress {
  0% {
    stroke-dashoffset: 100;
  }

  100% {
    stroke-dashoffset: var(--progress);
  }
}

.progress-circle {
  transform: rotate(-90deg);
  transform-origin: center;
}

.progress-animation {
  animation: fillProgress 1.5s ease-out forwards;
}
</style>
<style>
/* Tailwind custom keyframes for fade and slide */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-card {
  animation: fadeIn 0.5s ease-out;
}
</style>

<style lang="scss" scoped>
@responsive {
  .w-400 {
    width: 400px;
  }

  .w-100-per {
    width: 100%;
  }
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.slide-right-enter-active {
  transition: all 0.3s ease-out;
}

.slide-right-leave-active {
  transition: all 0.3s ease-in;
}

.slide-right-enter-to,
.slide-right-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.bg-timer {
  background-color: #D76565;
}

.success-message {
  background-color: #28a745;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.text-xxs {
  font-size: 10px;
}

.text-red-1 {
  color: #D76565;
}

.ht-34 {
  height: 34px;
}
</style>

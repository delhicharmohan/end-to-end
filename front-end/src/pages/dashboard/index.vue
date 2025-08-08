<template>
  <section class="flex-auto p-4 overflow-y-auto">
    <base-card v-if="isSupport" class="h-full w-full flex flex-col overflow-y-auto">
      <div class="flex flex-col">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total Tickets
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getTotalTickets }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pending
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ pendingTicketsCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Solved
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ solvedTicketsCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Not Solved
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ notSolvedTicketsCount }}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>
    </base-card>
    <base-card v-else-if="isOrderCreator" class="h-full w-full flex flex-col overflow-y-auto">
      <div v-if="isShowPayInStatistics" class="flex flex-col">
        <h1 class="text-xl font-semibold">Pay In Statistics</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total Orders
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getManualPayInTotalOrders }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayIn Operations
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayInApprovedCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayIn
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayInApprovedValue }}
                  <span class="text-sm font-medium">({{ manualPayInApprovedDiff }})</span>
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Created
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayInCreatedCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pending
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayInPendingCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Failed
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayInFailedCount }}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="isShowPayOutStatistics" class="flex flex-col mt-8">
        <h1 class="text-xl font-semibold">Pay Out Statistics</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total Orders
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getManualPayOutTotalOrders }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayOut Operations
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayOutApprovedCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayOut
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayOutApprovedValue }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pending
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayOutPendingCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Rejected
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayOutRejectedCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Failed
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ manualPayOutFailedCount }}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col mt-16">
        <div class="w-full flex justify-end mb-8 items-center">
          <div class="w-40 ml-8">
            <select v-model="selectedDay">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="customdate">Custom Date</option>
            </select>
          </div>
          <div v-if="isCustomDateSelected" class="flex items-center ml-8">
            <div class="w-40 mr-8">
              <!-- <label for="startDate">Start Date</label> -->
              <input type="date" id="startDate" v-model.trim="startDate" />
            </div>
            <div class="w-40">
              <!-- <label for="endDate">End Date</label> -->
              <input type="date" id="endDate" v-model.trim="endDate" />
            </div>
          </div>
        </div>
      </div>
    </base-card>
    <base-card v-else class="h-full w-full flex flex-col overflow-y-auto">

      <div v-if="isShowPayInStatistics" class="flex flex-col">
        <h1 class="text-xl font-semibold">Pay In Statistics</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayIn Operations
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getTotalPayInOperations }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayIn
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getTotalPayIn }}
                  <span class="text-sm font-medium">({{ getTotalPayInDiff }})</span>
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pending
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getPayInPendingCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Failed
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getPayInFailedCount }}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isShowPayOutStatistics" class="flex flex-col" :class="isShowPayInStatistics ? 'mt-8' : ''">
        <h1 class="text-xl font-semibold">Pay Out Statistics</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayOut Operations
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getTotalPayOutOperations }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Total PayOut
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getTotalPayOut }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pending
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getPayOutPendingCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Failed
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getPayOutFailedCount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Rejected
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ getPayOutRejectedCount }}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col mt-8">
        <h1 class="text-xl font-semibold">Total Statistics</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Settlement Amount
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ settlementAmount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pay In Commission
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ payInCommissionAmount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Pay Out Commission
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ payOutCommissionAmount }}
                </h5>
              </div>
            </div>
          </div>
          <div class="w-full flex flex-col break-words bg-white shadow-lg rounded-2xl bg-clip-border border p-4">
            <div class="flex flex-row flex-wrap">
              <div class="w-full flex flex-col">
                <p class="mb-0 font-sans font-light leading-normal text-sm">
                  Amount to be paid
                </p>
                <h5 class="mb-0 font-bold text-xl mt-2">
                  {{ amountToBePaid }}
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col" :class="isShowPayInStatistics || isShowPayOutStatistics ? 'mt-16' : 'mt-4'">
        <div class="w-full flex justify-end mb-8 items-center">
          <div v-if="isSuperAdmin" class="w-40 mr-8">
            <select v-model="vendor">
              <option value="">All</option>
              <option v-for="(v, index) in vendors" :key="index" :value="v.username">{{ v.username }}</option>
            </select>
          </div>
          <div v-if="isAdmin || isSubAdmin" class="w-40 mr-8">
            <select v-model="orderCreator">
              <option value="">All</option>
              <option v-for="(oc, index) in orderCreators" :key="index" :value="oc.username">{{ oc.username }}</option>
            </select>
          </div>
          <div class="w-40">
            <select v-model="paymentType">
              <option v-for="(item, index) in paymentTypeList" :key="index" :value="item.value">{{ item.name }}</option>
            </select>
          </div>
          <div class="w-40 ml-8">
            <select v-model="selectedDay">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="customdate">Custom Date</option>
            </select>
          </div>

          <div v-if="isCustomDateSelected" class="flex items-center ml-8">
            <div class="w-40 mr-8">
              <!-- <label for="startDate">Start Date</label> -->
              <input type="date" id="startDate" v-model.trim="startDate" />
            </div>
            <div class="w-40">
              <!-- <label for="endDate">End Date</label> -->
              <input type="date" id="endDate" v-model.trim="endDate" />
            </div>
          </div>

          <div class="w-40 ml-8">
            <select v-model="website">
              <option value="">All</option>
              <option v-for="(w, index) in websites" :key="index" :value="w.website">{{ w.website }}</option>
            </select>
          </div>
        </div>

        <apexchart type="bar" height="350" :options="chartOptions" :series="series"></apexchart>
      </div>
    </base-card>
  </section>
</template>
<script>
import http from "../../http-common.js";
export default {
  name: "dashboard",
  data: function () {
    return {
      startDate: "",
      endDate: "",
      isCustomDateSelected: false,
      website: "",
      selectedDay: "today",
      chartOptions: {
        chart: {
          type: "bar",
          height: 350,
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "55%",
            endingShape: "rounded",
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          show: true,
          width: 2,
          colors: ["transparent"],
        },
        xaxis: {
          categories: Array.from({ length: 24 }, (_, i) => i),
          title: {
            text: "Hour",
          },
        },
        yaxis: {
          title: {
            text: "Amount",
          },
        },
        fill: {
          opacity: 1,
        },
        tooltip: {
          y: {
            formatter: function (val) {
              return "₹ " + val.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
            },
          },
        },
      },
      websites: [],
      paymentType: "",
      orderCreators: [],
      orderCreator: "",
      vendors: [],
      vendor: "",
      pendingTicketsCount: 0,
      solvedTicketsCount: 0,
      notSolvedTicketsCount: 0,
      manualPayInCreatedCount: 0,
      manualPayInCreatedValue: 0,
      manualPayInCreatedDiff: 0,
      manualPayInPendingCount: 0,
      manualPayInPendingValue: 0,
      manualPayInPendingDiff: 0,
      manualPayInApprovedCount: 0,
      manualPayInApprovedValue: 0,
      manualPayInApprovedDiff: 0,
      manualPayInFailedCount: 0,
      manualPayInFailedValue: 0,
      manualPayInFailedDiff: 0,
      manualPayInRejectedCount: 0,
      manualPayInRejectedValue: 0,
      manualPayInRejectedDiff: 0,
      manualPayInExpiredCount: 0,
      manualPayInExpiredValue: 0,
      manualPayInExpiredDiff: 0,
      manualPayInUnassignedCount: 0,
      manualPayInUnassignedValue: 0,
      manualPayInUnassignedDiff: 0,
      manualPayOutCreatedCount: 0,
      manualPayOutCreatedValue: 0,
      manualPayOutPendingCount: 0,
      manualPayOutPendingValue: 0,
      manualPayOutApprovedCount: 0,
      manualPayOutApprovedValue: 0,
      manualPayOutFailedCount: 0,
      manualPayOutFailedValue: 0,
      manualPayOutRejectedCount: 0,
      manualPayOutRejectedValue: 0,
      manualPayOutExpiredCount: 0,
      manualPayOutExpiredValue: 0,
      manualPayOutUnassignedCount: 0,
      manualPayOutUnassignedValue: 0,
      payInCommissionAmount: 0,
      payOutCommissionAmount: 0,
    };
  },
  created() {
    if (this.isSupport) {
      this.getDashboardTicketStatics();
    } else if (this.isOrderCreator) {
      this.getManualOrderStatics();
    } else {
      if (this.isAdmin || this.isSubAdmin) {
        this.getOrderCreatorUsers();
      }
      this.setPaymentType();
      this.getWebsites();
      this.getDashboardOrderStatics();
      this.getOrderTotalStatics();
      this.getBarChartData();
      if (this.isSuperAdmin) {
        this.getVendors();
      }
    }
  },
  watch: {
    selectedDay(neVal) {
      if (neVal == "customdate") {
        this.isCustomDateSelected = true;
      } else {
        this.isCustomDateSelected = false;
        if (this.isSupport) {
          this.getDashboardTicketStatics();
        } else if (this.isOrderCreator) {
          this.getManualOrderStatics();
        } else {
          this.getDashboardOrderStatics();
          this.getOrderTotalStatics();
          this.getBarChartData();
        }
        this.startDate = "";
        this.endDate = "";
      }
    },
    website() {
      this.getDashboardOrderStatics();
      this.getOrderTotalStatics();
      this.getBarChartData();
    },
    startDate(newVal) {
      if (newVal && this.endDate != "") {
        if (this.isSupport) {
          this.getDashboardTicketStatics();
        } else if (this.isOrderCreator) {
          this.getManualOrderStatics();
        } else {
          this.getDashboardOrderStatics();
          this.getOrderTotalStatics();
          this.getBarChartData();
        }
      }
    },
    endDate(newVal) {
      if (newVal && this.startDate != "") {
        if (this.isSupport) {
          this.getDashboardTicketStatics();
        } else if (this.isOrderCreator) {
          this.getManualOrderStatics();
        } else {
          this.getDashboardOrderStatics();
          this.getOrderTotalStatics();
          this.getBarChartData();
        }
      }
    },
    paymentType() {
      this.getBarChartData();
    },
    vendor() {
      this.getDashboardOrderStatics();
      this.getOrderTotalStatics();
      this.getBarChartData();
    },
    orderCreator() {
      this.getDashboardOrderStatics();
      this.getOrderTotalStatics();
      this.getBarChartData();
    },
  },
  computed: {
    getManualPayInTotalOrders() {
      return this.manualPayInCreatedCount + this.manualPayInPendingCount + this.manualPayInApprovedCount + this.manualPayInRejectedCount + this.manualPayInFailedCount + this.manualPayInUnassignedCount + this.manualPayInExpiredCount;
    },
    getManualPayOutTotalOrders() {
      return this.manualPayOutCreatedCount + this.manualPayOutPendingCount + this.manualPayOutApprovedCount + this.manualPayOutRejectedCount + this.manualPayOutFailedCount + this.manualPayOutUnassignedCount + this.manualPayOutExpiredCount;
    },
    isOrderCreator() {
      return this.$store.getters.isOrderCreator;
    },
    isSupport() {
      return this.$store.getters.isSupport;
    },
    isSuperAdmin() {
      return this.$store.getters.isSuperAdmin;
    },
    isAdmin() {
      return this.$store.getters.isAdmin;
    },
    isSubAdmin() {
      return this.$store.getters.isSubAdmin;
    },
    getTotalPayInOperations() {
      return this.$store.getters["payin/totalPayInOperations"];
    },
    getTotalPayIn() {
      return this.$store.getters["payin/totalPayIn"];
    },
    getTotalPayInDiff() {
      return this.$store.getters["payin/totalPayInDiff"];
    },
    getTotalPayOutOperations() {
      return this.$store.getters["payin/totalPayOutOperations"];
    },
    getTotalPayOut() {
      return parseInt(this.$store.getters["payin/totalPayOut"]);
    },
    getPayInUnassignedCount() {
      return this.$store.getters["payin/payInUnassignedCount"];
    },
    getPayInFailedCount() {
      return this.$store.getters["payin/payInFailedCount"];
    },
    getPayOutUnassignedCount() {
      return this.$store.getters["payin/payOutUnassignedCount"];
    },
    getPayInPendingCount() {
      return this.$store.getters["payin/payInPendingCount"];
    },
    getPayOutPendingCount() {
      return this.$store.getters["payin/payOutPendingCount"];
    },
    getPayInExpiredCount() {
      return this.$store.getters["payin/payInExpiredCount"];
    },
    getPayInRejectedCount() {
      return this.$store.getters["payin/payInRejectedCount"];
    },
    getPayOutRejectedCount() {
      return this.$store.getters["payin/payOutRejectedCount"];
    },
    getPayOutFailedCount() {
      return this.$store.getters["payin/payOutFailedCount"];
    },
    series() {
      return this.$store.getters["payin/barChartDataSeries"];
    },
    isShowPayInStatistics() {
      if (this.$store.getters.isUser || this.$store.getters.isOrderCreator) {
        if (this.$store.getters.payInStatus == "0") {
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    },
    isShowPayOutStatistics() {
      if (this.$store.getters.isUser || this.$store.getters.isOrderCreator) {
        if (this.$store.getters.payOutStatus == "0") {
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    },
    paymentTypeList() {
      let list = [];
      if (this.isShowPayInStatistics) {
        list.push({
          name: "Pay In",
          value: "payin",
        });
      }
      if (this.isShowPayOutStatistics) {
        list.push({
          name: "Pay Out",
          value: "payout",
        });

      }
      return list;
    },
    getTotalTickets() {
      return this.pendingTicketsCount + this.solvedTicketsCount + this.notSolvedTicketsCount;
    },
    settlementAmount() {
      return (this.getTotalPayIn - this.getTotalPayOut).toFixed(2);
    },
    amountToBePaid() {
      return (this.settlementAmount - this.payInCommissionAmount - this.payOutCommissionAmount).toFixed(2);
    },
  },
  methods: {
    async getManualOrderStatics() {
      try {
        const params = {
          type: "dashboard",
          selectedDay: this.selectedDay,
          website: this.website,
          startDate: this.startDate,
          endDate: this.endDate,
          vendor: this.vendor,
        };

        const response = await http.get(
          `/order-creator/getManualOrderStatics?selectedDay=${params.selectedDay}&website=${params.website}&startDate=${params.startDate}&endDate=${params.endDate}&vendor=${params.vendor}`
        );

        if (response.status == 200) {
          let manualPayInArrObj = [];
          let manualPayOutArrObj = [];

          const responseData = response.data.data;

          responseData.forEach((obj) => {
            if (obj.type === "payin") {
              const arrObj = {
                paymentStatus: obj.paymentStatus,
                count: obj.count,
                totalAmount: obj.total_amount,
                totalAmountDiff: obj.total_diff_amount,
              };
              manualPayInArrObj.push(arrObj);
            } else if (obj.type === "payout") {
              const arrObj = {
                paymentStatus: obj.paymentStatus,
                count: obj.count,
                totalAmount: obj.total_amount,
              };
              manualPayOutArrObj.push(arrObj);
            }
          });

          let manualPayInArray = {
            unassigned: {
              count: 0,
              value: 0,
            },
            pending: {
              count: 0,
              value: 0,
            },
            approved: {
              count: 0,
              value: 0,
            },
            expired: {
              count: 0,
              value: 0,
            },
            rejected: {
              count: 0,
              value: 0,
            },
            failed: {
              count: 0,
              value: 0,
            },
            created: {
              count: 0,
              value: 0,
            },
          };

          manualPayInArrObj.forEach((element) => {
            manualPayInArray[element.paymentStatus].count = element.count;
            manualPayInArray[element.paymentStatus].value = element.totalAmount;
            manualPayInArray[element.paymentStatus].diff = element.totalAmountDiff;
          });

          this.manualPayInCreatedCount = manualPayInArray.created.count;
          this.manualPayInCreatedValue = manualPayInArray.created.value;
          this.manualPayInCreatedDiff = manualPayInArray.created.diff;
          this.manualPayInPendingCount = manualPayInArray.pending.count;
          this.manualPayInPendingValue = manualPayInArray.pending.value;
          this.manualPayInPendingDiff = manualPayInArray.pending.diff;
          this.manualPayInApprovedCount = manualPayInArray.approved.count;
          this.manualPayInApprovedValue = manualPayInArray.approved.value;
          this.manualPayInApprovedDiff = manualPayInArray.approved.diff;
          this.manualPayInFailedCount = manualPayInArray.failed.count;
          this.manualPayInFailedValue = manualPayInArray.failed.value;
          this.manualPayInFailedDiff = manualPayInArray.failed.diff;
          this.manualPayInRejectedCount = manualPayInArray.rejected.count;
          this.manualPayInRejectedValue = manualPayInArray.rejected.value;
          this.manualPayInRejectedDiff = manualPayInArray.rejected.diff;
          this.manualPayInExpiredCount = manualPayInArray.expired.count;
          this.manualPayInExpiredValue = manualPayInArray.expired.value;
          this.manualPayInExpiredDiff = manualPayInArray.expired.diff;
          this.manualPayInUnassignedCount = manualPayInArray.unassigned.count;
          this.manualPayInUnassignedValue = manualPayInArray.unassigned.value;
          this.manualPayInUnassignedDiff = manualPayInArray.unassigned.diff;


          let manualPayOutArray = {
            unassigned: {
              count: 0,
              value: 0,
            },
            pending: {
              count: 0,
              value: 0,
            },
            approved: {
              count: 0,
              value: 0,
            },
            expired: {
              count: 0,
              value: 0,
            },
            rejected: {
              count: 0,
              value: 0,
            },
            failed: {
              count: 0,
              value: 0,
            },
            created: {
              count: 0,
              value: 0,
            },
          };

          manualPayOutArrObj.forEach((element) => {
            manualPayOutArray[element.paymentStatus].count = element.count;
            manualPayOutArray[element.paymentStatus].value = element.totalAmount;
          });

          this.manualPayOutCreatedCount = manualPayOutArray.created.count;
          this.manualPayOutCreatedValue = manualPayOutArray.created.value;
          this.manualPayOutPendingCount = manualPayOutArray.pending.count;
          this.manualPayOutPendingValue = manualPayOutArray.pending.value;
          this.manualPayOutApprovedCount = manualPayOutArray.approved.count;
          this.manualPayOutApprovedValue = manualPayOutArray.approved.value;
          this.manualPayOutFailedCount = manualPayOutArray.failed.count;
          this.manualPayOutFailedValue = manualPayOutArray.failed.value;
          this.manualPayOutRejectedCount = manualPayOutArray.rejected.count;
          this.manualPayOutRejectedValue = manualPayOutArray.rejected.value;
          this.manualPayOutExpiredCount = manualPayOutArray.expired.count;
          this.manualPayOutExpiredValue = manualPayOutArray.expired.value;
          this.manualPayOutUnassignedCount = manualPayOutArray.unassigned.count;
          this.manualPayOutUnassignedValue = manualPayOutArray.unassigned.value;

        }



      } catch (error) {
        this.error = error.message || "Something failed!";
      }
    },
    async getDashboardOrderStatics() {
      try {
        const payload = {
          type: "dashboard",
          selectedDay: this.selectedDay,
          website: this.website,
          startDate: this.startDate,
          endDate: this.endDate,
          vendor: this.vendor,
          orderCreator: this.orderCreator,
        };
        await this.$store.dispatch("payin/getOrderStatics", payload);
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
    },
    onHoverDate(event) {
      console.log(event);
    },
    onDateClick(event) {
      console.log(event);
    },
    async getBarChartData() {
      try {
        const params = {
          type: "dashboard",
          selectedDay: this.selectedDay,
          website: this.website,
          startDate: this.startDate,
          endDate: this.endDate,
          paymentType: this.paymentType,
          vendor: this.vendor,
          orderCreator: this.orderCreator,
        };
        await this.$store.dispatch("payin/getBarChartData", params);
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
    },
    async getWebsites() {
      try {
        const response = await http.get("/reports/websites");
        if (response.status === 200) {
          this.websites = response.data;
        }
      } catch (error) {
        console.log(error);
      }
    },
    setPaymentType() {
      if (this.isShowPayInStatistics && this.isShowPayOutStatistics) {
        this.paymentType = "payin";
      } else if (this.isShowPayInStatistics) {
        this.paymentType = "payin";
      } else if (this.isShowPayOutStatistics) {
        this.paymentType = "payout";
      } else {
        this.paymentType = "";
      }
    },
    async getOrderCreatorUsers() {
      try {
        const response = await http.get("/users/order_creator");
        if (response.status == 200) {
          this.orderCreators = response.data;
        }
      } catch (error) {
        console.log(error);
      }
    },
    async getVendors() {
      try {
        const response = await http.get("/users/admin");
        if (response.status == 200) {
          this.vendors = response.data;
        }
      } catch (error) {
        console.log(error);
      }
    },
    async getDashboardTicketStatics() {
      try {
        const response = await http.get("/support-user/getDashboardTicketStatics");
        if (response.status === 200) {
          response.data.forEach(item => {
            switch (item.status_description) {
              case 'pending':
                this.pendingTicketsCount = item.record_count;
                break;
              case 'solved':
                this.solvedTicketsCount = item.record_count;
                break;
              case 'not_solved':
                this.notSolvedTicketsCount = item.record_count;
                break;
            }
          });
        }
      } catch (error) {
        console.log(error);
      }
    },
    async getOrderTotalStatics() {
      try {
        const params = {
          type: "dashboard",
          selectedDay: this.selectedDay,
          website: this.website,
          startDate: this.startDate,
          endDate: this.endDate,
          vendor: this.vendor,
          orderCreator: this.orderCreator,
        };
        const response = await http.get(`/orders/getOrderTotalStatics/${params.type}?selectedDay=${params.selectedDay}&website=${params.website}&startDate=${params.startDate}&endDate=${params.endDate}&vendor=${params.vendor}&orderCreator=${params.orderCreator}`);
        if (response.status === 200) {
          const responseData = response.data.data;
          this.payInCommissionAmount = responseData.payInCommissionAmount;
          this.payOutCommissionAmount = responseData.payOutCommissionAmount;
        }
      } catch (error) {
        console.log(error);
      }
    },
  },
};
</script>

<style lang="scss" scoped></style>

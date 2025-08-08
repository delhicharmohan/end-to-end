<template>
    <div class="h-full w-full flex flex-col">
        <div class="flex justify-start items-center flex-wrap">
            <div class="w-40">
                <label for="startDate">Payment Type</label>
                <select v-model="paymentType">
                    <option value="payin">Pay In</option>
                    <option value="payout">Pay Out</option>
                </select>
            </div>
            <div class="w-40 ml-8">
                <label for="startDate">Date</label>
                <select v-model="selectedDay">
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="customdate">Custom Date</option>
                </select>
            </div>
            <div v-if="isCustomDateSelected" class="flex items-center ml-8">
                <div class="w-40 mr-8">
                <label for="startDate">Start Date</label>
                <input type="date" id="startDate" v-model.trim="startDate" />
                </div>
                <div class="w-40">
                <label for="endDate">End Date</label>
                <input type="date" id="endDate" v-model.trim="endDate" />
                </div>
            </div>
        </div>
        <base-spinner v-if="isLoading" class="flex-auto mt-6"></base-spinner>
        <div v-else class="flex flex-col mt-6">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th colspan="2" class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approved
                            </th>
                            <th colspan="2" class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pending
                            </th>
                            <th colspan="2" class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rejected
                            </th>
                            <th colspan="2" class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unassigned
                            </th>
                            <th colspan="2" class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expired
                            </th>
                        </tr>
                        <tr>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                            </th>
                            <th class="border px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ report.approvedCount }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ parseInt(report.approvedAmount) }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ report.pendingCount }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ parseInt(report.pendingAmount) }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ report.rejectedCount }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ parseInt(report.rejectedAmount) }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ report.unassignedCount }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ parseInt(report.unassignedAmount) }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ report.expiredCount }}
                            </td>
                            <td class="border px-6 py-4 whitespace-nowrap text-center">
                            {{ parseInt(report.expiredAmount) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script>
import http from "../../http-common";
export default {
  name: "user-report",
  props: ["username"],
  data() {
    return {
        isLoading: false,
        paymentType: "payin",
        selectedDay: "today",
        isCustomDateSelected: false,
        startDate: "",
        endDate: "",
        report: {},
    };
  },
  created() {
    this.getUserReport();
  },
  watch: {
    paymentType() {
      this.getUserReport();
    },
    selectedDay(neVal) {
      if (neVal == "customdate") {
        this.isCustomDateSelected = true;
      } else {
        this.isCustomDateSelected = false;
        this.getUserReport();
        this.startDate = "";
        this.endDate = "";
      }
    },
    startDate(newVal) {
      if (newVal && this.endDate != "") {
        this.getUserReport();
      }
    },
    endDate(newVal) {
      if (newVal && this.startDate != "") {
        this.getUserReport();
      }
    },
  },
  methods: {
    async getUserReport() {
        this.isLoading = true;
        try {
            let url = `/reports/userReport?username=${this.username}&type=${this.paymentType}&selectedDay=${this.selectedDay}&startDate=${this.startDate}&endDate=${this.endDate}`;
            const response = await http.get(url);
            if (response.status == 200) {
                this.report = response.data;
            } else {
                console.log("Unauthorized: You are not an admin.");
            }
        } catch (error) {
            console.log(error.message);
        }
        this.isLoading = false;
    },
  },
};
</script>

<style lang="scss" scoped>
</style>

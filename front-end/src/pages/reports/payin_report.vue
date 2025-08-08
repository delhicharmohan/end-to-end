<template>
  <div class="h-full w-full flex flex-col">
    <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
    <div
      v-else-if="hasReports && !isLoading"
      class="flex flex-col overflow-x-auto"
    >
      <div class="sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full sm:px-6 lg:px-8">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm font-light">
              <thead class="border-b font-medium dark:border-neutral-500">
                <tr>
                  <th scope="col" class="px-6 py-4">#</th>
                  <th scope="col" class="px-6 py-4">Platform</th>
                  <th scope="col" class="px-6 py-4">Vendor</th>
                  <th scope="col" class="px-6 py-4">Order ID</th>
                  <th scope="col" class="px-6 py-4">Receipt ID</th>
                  <th scope="col" class="px-6 py-4">Customer Name</th>
                  <th scope="col" class="px-6 py-4">Amount</th>
                  <th scope="col" class="px-6 py-4">Payment Status</th>
                  <th scope="col" class="px-6 py-4">Automation Type</th>
                  <th scope="col" class="px-6 py-4">UTR</th>
                  <th scope="col" class="px-6 py-4">Type</th>
                  <th scope="col" class="px-6 py-4">Payment Type</th>
                  <th scope="col" class="px-6 py-4">Transaction Type</th>
                  <th scope="col" class="px-6 py-4">Account Number</th>
                  <th scope="col" class="px-6 py-4">IFSC</th>
                  <th scope="col" class="px-6 py-4">Bank Name</th>
                  <th scope="col" class="px-6 py-4">Created By</th>
                  <th scope="col" class="px-6 py-4">Assigned To</th>
                  <th scope="col" class="px-6 py-4">Assigned UPI</th>
                  <th scope="col" class="px-6 py-4">Approved By</th>
                  <!-- <th scope="col" class="px-6 py-4">Customer UPI ID</th>
                  <th scope="col" class="px-6 py-4">Customer Mobile</th>
                  <th scope="col" class="px-6 py-4">Customer IP</th> -->
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(report, index) in filteredReports"
                  :key="index"
                  class="border-b dark:border-neutral-500"
                >
                  <td class="whitespace-nowrap px-6 py-4 font-medium">
                    {{ index + 1 }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.clientName }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.vendor }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.merchantOrderId }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 uppercase">
                    {{ report.receiptId }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.customerName }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.amount }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.paymentStatus }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ getAutomationMode(report.automation_type)  }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.transactionID }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">{{ report.type }}</td>
                  <td class="whitespace-nowrap px-6 py-4">{{ report.mode }}</td>
                  <td class="whitespace-nowrap px-6 py-4">{{ report.transactionType }}</td>
                  <td class="whitespace-nowrap px-6 py-4">{{ report.accountNumber }}</td>
                  <td class="whitespace-nowrap px-6 py-4">{{ report.ifsc }}</td>
                  <td class="whitespace-nowrap px-6 py-4">{{ report.bankName }}</td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ getCreatedBy(report.created_by) }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.validatorUsername }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.validatorUPIID }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{
                      getApprovedBy(report.approvedBy, report.validatorUsername)
                    }}
                  </td>
                  <!-- <td class="whitespace-nowrap px-6 py-4">
                    {{ report.customerUPIID }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.customerMobile }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ report.customerIp }}
                  </td> -->
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <h3 v-else class="text-center font-medium">No reports found!</h3>
  </div>
</template>

<script>
export default {
  name: "pay-in-report",
  emits: ["edit-client"],
  data() {
    return {
      isLoading: false,
      error: null,
    };
  },
  created() {
    this.getReports();
  },
  computed: {
    hasReports() {
      return this.$store.getters["reports/hasReports"];
    },
    filteredReports() {
      return this.$store.getters["reports/reports"];
    },
  },
  methods: {
    getCreatedBy(createdBy) {
      if (createdBy == 'common_link') {
        return "Common Link";
      } else {
        return createdBy;
      }
    },
    async getReports() {
      this.isLoading = true;
      try {
        await this.$store.dispatch("reports/getReports");
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },

    getAutomationMode(automationType) {
      if (automationType == "bank_sms") {
        return 'Bank SMS';
      } else if(automationType == 'bank_data') {
        return 'Bank Login';
      } else {
        return '';
      }
    },

    getApprovedBy(approvedBy, approvedUsername) {
      if (approvedBy == "user") {
        return approvedUsername;
      } else {
        return "Admin";
      }
    },
  },
};
</script>

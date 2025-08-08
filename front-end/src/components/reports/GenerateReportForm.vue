<template>
  <form
    @submit.prevent="submitForm"
    class="flex flex-row flex-wrap px-4 mt-4 mb-4"
  >
    <div class="w-full flex flex-row flex-wrap mt-4">
      <div class="w-1/2 pr-4" :class="{ invalid: !reportName.isValid }">
        <label for="reportName">Report Name</label>
        <input
          type="text"
          id="reportName"
          v-model.trim="reportName.val"
          @blur="clearValidity('reportName')"
        />
        <p v-if="!reportName.isValid" class="text-xs text-red-600">
          Report Name must not be empty.
        </p>
      </div>
      <div class="w-1/2 pl-4">
        <label for="reportType">Report Type</label>
        <select id="reportType" v-model.trim="reportType.val">
          <option value="">All</option>
          <option value="payin">Pay In</option>
          <option value="payout">Pay Out</option>
        </select>
      </div>

      <div class="mt-4 w-1/2 pr-4">
        <label for="clientName">Platform</label>
        <select id="clientName" v-model.trim="clientName.val">
          <option value="">All</option>
          <option
            v-for="(w, index) in websites"
            :key="index"
            :value="w.website"
            >{{ w.website }}</option
          >
        </select>
      </div>
      <div class="mt-4 w-1/2 pl-4">
        <label for="status">Status</label>
        <select id="status" v-model.trim="status.val">
          <option value="">All</option>
          <option value="unassigned">Unassigned</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="expired">Expired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !amount.isValid }">
        <label for="amount">Amount</label>
        <input
          type="number"
          id="amount"
          v-model.trim="amount.val"
          @blur="clearValidity('amount')"
        />
        <p v-if="!amount.isValid" class="text-xs text-red-600">
          {{ amount.msg }}
        </p>
      </div>
      <div class="mt-4 w-1/2 pl-4">
        <label for="user">User</label>
        <select id="user" v-model.trim="validatorUsername.val">
          <option value="">All</option>
          <option
            v-for="(agent, index) in agents"
            :key="index"
            :value="agent.username"
            >{{ agent.username }}</option
          >
        </select>
      </div>
      <div class="mt-4 w-1/2 pr-4">
        <label for="startDate">Start Date</label>
        <input type="date" id="startDate" v-model.trim="startDate.val" />
      </div>
      <div class="mt-4 w-1/2 pl-4">
        <label for="endDate">End Date</label>
        <input type="date" id="startDate" v-model.trim="endDate.val" />
      </div>
    </div>
    <div class="w-full flex flex-col justify-center items-center mt-8">
      <p v-if="!formIsValid" class="mb-4 text-red-600">
        Please fix the above errors and submit again.
      </p>
      <base-button><span class="capitalize">Generate</span></base-button>
    </div>
  </form>
</template>

<script>
import http from "../../http-common";
export default {
  name: "generate-report-form",
  emits: ["generate-report"],
  data() {
    return {
      reportName: {
        val: "",
        isValid: true,
        msg: "",
      },
      reportType: {
        val: "",
        isValid: true,
        msg: "",
      },
      clientName: {
        val: "",
        isValid: true,
        msg: "",
      },
      status: {
        val: "",
        isValid: true,
        msg: "",
      },
      amount: {
        val: "",
        isValid: true,
        msg: "",
      },
      validatorUsername: {
        val: "",
        isValid: true,
        msg: "",
      },
      startDate: {
        val: "",
        isValid: true,
        msg: "",
      },
      endDate: {
        val: "",
        isValid: true,
        msg: "",
      },
      formIsValid: true,
      usersWithRole: [],
      websites: [],
    };
  },
  computed: {
    agents() {
      return this.usersWithRole;
    },
  },
  created() {
    this.getUsersWithRole();
    this.getWebsites();
  },
  methods: {
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
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;

      if (this.reportName.val === "") {
        this.reportName.isValid = false;
        this.formIsValid = false;
      }
    },
    submitForm() {
      this.validateForm();

      if (!this.formIsValid) {
        return;
      }

      let formData = {
        reportName: this.reportName.val,
        type: this.reportType.val,
        clientName: this.clientName.val,
        paymentStatus: this.status.val,
        amount: this.amount.val,
        validatorUsername: this.validatorUsername.val,
        startDate: this.startDate.val,
        endDate: this.endDate.val,
      };

      this.$emit("generate-report", formData);
    },
  },
};
</script>

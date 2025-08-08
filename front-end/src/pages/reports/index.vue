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
    <Transition name="fade" mode="out-in">
      <section key="1" v-if="isGenerateReport" class="h-full">
        <base-card class="h-full flex flex-col">
          <div class="flex w-full ht-42 px-4 mt-2">
            <div
              v-if="isLoading"
              class="h-full w-full flex justify-start items-center"
            >
              <icon-spinner class="text-blue-600"></icon-spinner>
              <h1 class="ml-2 font-semibold text-xl">
                {{ getFormTextLoading }}
              </h1>
            </div>
            <div v-else class="h-full w-full flex justify-start items-center">
              <icon-back
                @click.stop="backButtonClicked"
                class="text-blue-600"
              ></icon-back>
              <h1 class="ml-2 font-semibold text-xl">{{ getFormText }}</h1>
            </div>
          </div>
          <base-spinner class="flex-auto" v-if="isLoading"></base-spinner>
          <div v-else class="flex-auto flex flex-col overflow-y-auto">
            <generate-report-form
              @generate-report="generateReport"
            ></generate-report-form>
          </div>
        </base-card>
      </section>
      <section key="2" v-else class="h-full">
        <base-card
          class="h-full flex flex-col overflow-y-hidden"
          :class="isLoading ? 'flex' : ''"
        >
          <div class="flex justify-end items-center px-4 pt-4">
            <base-button mode="outline" @click.stop="createBtnClicked"
              >Generate</base-button
            >
          </div>
          <pay-in-report></pay-in-report>
        </base-card>
      </section>
    </Transition>
  </div>
</template>

<script>
import PayInReport from "./payin_report.vue";
import GenerateReportForm from "../../components/reports/GenerateReportForm.vue";
import IconSpinner from "../../components/icons/IconSpinner.vue";
import IconBack from "../../components/icons/IconBack.vue";
import xlsx from "xlsx/dist/xlsx.full.min.js";
export default {
  name: "clients",
  components: {
    PayInReport,
    GenerateReportForm,
    IconSpinner,
    IconBack,
  },
  data() {
    return {
      isLoading: false,
      error: null,
      isGenerateReport: false,
      baseToast: {
        type: "",
        message: "",
      },
    };
  },
  computed: {
    getFormText() {
      return "Generate Report";
    },
    getFormTextLoading() {
      return "Generating...";
    },
    generatedReport() {
      return this.$store.getters["reports/generatedReport"];
    },
  },
  methods: {
    backButtonClicked() {
      this.isGenerateReport = false;
    },
    createBtnClicked() {
      this.isGenerateReport = true;
    },
    handleError() {
      this.error = null;
    },
    handleBaseToast() {
      this.baseToast = {
        type: "",
        message: "",
      };
    },
    async generateReport(data) {
      const reportName = data.reportName;
      delete data.reportName;
      this.isLoading = true;
      try {
        await this.$store.dispatch("reports/generateReport", data);

        if (this.generatedReport.length > 0) {
          this.baseToast.message = "Report generated successfully!";
          this.baseToast.type = "success";
          this.exportExcel(reportName);
        } else {
          this.baseToast.message = "0 records found. Report not created!";
          this.baseToast.type = "warning";
        }

        let $this = this;
        setTimeout(() => {
          $this.handleBaseToast();
        }, 1000);
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },
    exportExcel(reportName) {
      const XLSX = xlsx;
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(this.generatedReport);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, `${reportName}.xlsx`);
    },
  },
};
</script>

<style lang="scss" scoped>
@responsive {
  .ht-42 {
    height: 42px;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

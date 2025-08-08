import http from "../../../http-common.js";

export default {
  async getReports(context) {
    try {
      const response = await http.get("/reports");

      if (response.status == 200) {
        const count = response.data.data.length;
        const responseData = response.data.data;
        context.commit("setReports", responseData);
        context.commit("setReportsCount", count);
      } else {
        const error = new Error("Something went wrong!");
        throw error;
      }
    } catch (error) {
      const errorMessage = {
        status: error.response.data.success,
        message: new Error(error.response.data.message || "Something failed!"),
      };
      throw errorMessage;
    }
  },
  async generateReport(context, data) {
    let generatedReport;
    try {
      const response = await http.post("/reports", data);
      if (response.status == 200) {
        generatedReport = response.data.data;
      } else {
        const error = new Error("Something went wrong!");
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || "Something failed!"
      );
      throw errorMessage;
    }

    context.commit("setGeneratedReport", generatedReport);
  },
};

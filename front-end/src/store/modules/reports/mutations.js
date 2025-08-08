export default {
  setReports(state, payload) {
    state.reports = payload;
  },
  setGeneratedReport(state, payload) {
    state.generatedReport = payload;
  },
  setReportsCount(state, count) {
    state.reportsCount = count;
  },
};

export default {
  reports(state) {
    return state.reports;
  },
  generatedReport(state) {
    return state.generatedReport;
  },
  reportsCount(state) {
    return state.reportsCount;
  },
  hasReports(_, getters) {
    return getters.reportsCount > 0;
  },
};

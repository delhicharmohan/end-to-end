export default {
  payInList(state) {
    return state.payInList;
  },
  hasPayInList(_, getters) {
    return getters.payInList && getters.payInList.length > 0;
  },
  pagination(state) {
    return state.pagination;
  },
  payInArray(state) {
    return state.payInArray;
  },
  payOutArray(state) {
    return state.payOutArray;
  },
  totalPayInOperations(state) {
    return state.totalPayInOperations;
  },
  totalPayIn(state) {
    return state.totalPayIn;
  },
  totalPayOutOperations(state) {
    return state.totalPayOutOperations;
  },
  totalPayOut(state) {
    return state.totalPayOut;
  },
  payInExpiredCount(state) {
    return state.payInExpiredCount;
  },
  payInExpiredValue(state) {
    return state.payInExpiredValue;
  },
  payInUnassignedCount(state) {
    return state.payInUnassignedCount;
  },
  payInUnassignedValue(state) {
    return state.payInUnassignedValue;
  },
  payInPendingCount(state) {
    return state.payInPendingCount;
  },
  payInPendingValue(state) {
    return state.payInPendingValue;
  },
  payInRejectedCount(state) {
    return state.payInRejectedCount;
  },
  payInRejectedValue(state) {
    return state.payInRejectedValue;
  },
  payInFailedCount(state) {
    return state.payInFailedCount;
  },
  payInFailedValue(state) {
    return state.payInFailedValue;
  },
  payOutExpiredCount(state) {
    return state.payOutExpiredCount;
  },
  payOutExpiredValue(state) {
    return state.payOutExpiredValue;
  },
  payOutUnassignedCount(state) {
    return state.payOutUnassignedCount;
  },
  payOutUnassignedValue(state) {
    return state.payOutUnassignedValue;
  },
  payOutPendingCount(state) {
    return state.payOutPendingCount;
  },
  payOutPendingValue(state) {
    return state.payOutPendingValue;
  },
  payOutRejectedCount(state) {
    return state.payOutRejectedCount;
  },
  payOutRejectedValue(state) {
    return state.payOutRejectedValue;
  },
  payOutFailedCount(state) {
    return state.payOutFailedCount;
  },
  payOutFailedValue(state) {
    return state.payOutFailedValue;
  },
  barChartDataSeries(state) {
    return state.barChartDataSeries;
  },
  totalPayInDiff(state) {
    return state.totalPayInDiff;
  },
  payInExpiredDiff(state) {
    return state.payInExpiredDiff;
  },
  payInUnassignedDiff(state) {
    return state.payInUnassignedDiff;
  },
  payInPendingDiff(state) {
    return state.payInPendingDiff;
  },
  payInRejectedDiff(state) {
    return state.payInRejectedDiff;
  },
  payInFailedDiff(state) {
    return state.payInFailedDiff;
  },
};

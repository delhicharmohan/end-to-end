import mutations from "./mutations.js";
import actions from "./actions.js";
import getters from "./getters.js";

export default {
  namespaced: true,
  state() {
    return {
      payInList: [],
      pagination: {},
      totalPayInOperations: 0,
      totalPayIn: 0,
      totalPayOutOperations: 0,
      totalPayOut: 0,
      payInExpiredCount: 0,
      payInExpiredValue: 0,
      payInUnassignedCount: 0,
      payInUnassignedValue: 0,
      payInPendingCount: 0,
      payInPendingValue: 0,
      payInRejectedCount: 0,
      payInRejectedValue: 0,
      payInFailedCount: 0,
      payInFailedValue: 0,
      payOutExpiredCount: 0,
      payOutExpiredValue: 0,
      payOutUnassignedCount: 0,
      payOutUnassignedValue: 0,
      payOutPendingCount: 0,
      payOutPendingValue: 0,
      payOutRejectedCount: 0,
      payOutRejectedValue: 0,
      payOutFailedCount: 0,
      payOutFailedValue: 0,
      barChartDataSeries: [],
      totalPayInDiff: 0,
      payInExpiredDiff: 0,
      payInUnassignedDiff: 0,
      payInPendingDiff: 0,
      payInRejectedDiff: 0,
      payInFailedDiff: 0,
    };
  },
  mutations,
  actions,
  getters,
};

export default {
  setPayInList(state, payload) {
    state.payInList = payload;
  },
  setPagination(state, payload) {
    state.pagination = payload;
  },
  setPaymentStatusAndUtr(state, payload) {
    const refID = payload.refID;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].paymentStatus = 'approved';
    state.payInList[order].transactionID = payload.transactionID;
  },
  setPayOutOrderPaymentStatus(state, payload) {
    const refID = payload.refID;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].paymentStatus = payload.paymentStatus;
  },
  setPayInOrderStatics(state, payload) {
    let payInArray = {
      unassigned: {
        count: 0,
        value: 0,
        diff: 0
      },
      pending: {
        count: 0,
        value: 0,
        diff: 0
      },
      approved: {
        count: 0,
        value: 0,
        diff: 0
      },
      expired: {
        count: 0,
        value: 0,
        diff: 0
      },
      rejected: {
        count: 0,
        value: 0,
        diff: 0
      },
      failed: {
        count: 0,
        value: 0,
        diff: 0
      },
      created: {
        count: 0,
        value: 0,
        diff: 0
      }
    };

    payload.forEach(element => {
      payInArray[element.paymentStatus].count = element.count;
      payInArray[element.paymentStatus].value = element.totalAmount;
      payInArray[element.paymentStatus].diff = element.totalDiffAmount;
    });

    state.totalPayInOperations = payInArray.approved.count;
    state.totalPayIn = payInArray.approved.value;
    state.totalPayInDiff = payInArray.approved.diff;
    state.payInExpiredCount = payInArray.expired.count;
    state.payInExpiredValue = payInArray.expired.value;
    state.payInExpiredDiff = payInArray.expired.diff;
    state.payInUnassignedCount = payInArray.unassigned.count;
    state.payInUnassignedValue = payInArray.unassigned.value;
    state.payInUnassignedDiff = payInArray.unassigned.diff;
    state.payInPendingCount = payInArray.pending.count;
    state.payInPendingValue = payInArray.pending.value;
    state.payInPendingDiff = payInArray.pending.diff;
    state.payInRejectedCount = payInArray.rejected.count;
    state.payInRejectedValue = payInArray.rejected.value;
    state.payInRejectedDiff = payInArray.rejected.diff;
    state.payInFailedCount = payInArray.failed.count;
    state.payInFailedValue = payInArray.failed.value;
    state.payInFailedDiff = payInArray.failed.diff;
  },
  setPayOutOrderStatics(state, payload) {
    let payOutArray = {
      unassigned: {
        count: 0,
        value: 0
      },
      pending: {
        count: 0,
        value: 0
      },
      approved: {
        count: 0,
        value: 0
      },
      expired: {
        count: 0,
        value: 0
      },
      rejected: {
        count: 0,
        value: 0
      },
      failed: {
        count: 0,
        value: 0
      },
      created: {
        count: 0,
        value: 0
      }
    };

    payload.forEach(element => {
      payOutArray[element.paymentStatus].count = element.count;
      payOutArray[element.paymentStatus].value = element.totalAmount;
    });

    state.totalPayOutOperations = payOutArray.approved.count;
    state.totalPayOut = payOutArray.approved.value;
    state.payOutExpiredCount = payOutArray.expired.count;
    state.payOutExpiredValue = payOutArray.expired.value;
    state.payOutUnassignedCount = payOutArray.unassigned.count;
    state.payOutUnassignedValue = payOutArray.unassigned.value;
    state.payOutPendingCount = payOutArray.pending.count;
    state.payOutPendingValue = payOutArray.pending.value;
    state.payOutRejectedCount = payOutArray.rejected.count;
    state.payOutRejectedValue = payOutArray.rejected.value;
    state.payOutFailedCount = payOutArray.failed.count;
    state.payOutFailedValue = payOutArray.failed.value;
  },
  addOrderToPayInList(state, payload) {
    state.payInList.unshift(payload);
  },

  updateOrderToPayOutList(state, payload) {
    const refID = payload.refID;
    const orderIndex = state.payInList.findIndex(req => req.refID === refID);
    if (orderIndex == -1) {
      state.payInList.unshift(payload);
    } else {
      state.payInList[orderIndex] = payload;
    }
  },

  setBarChartDataSeries(state, payload) {
    state.barChartDataSeries = payload;
  },
  updateCustomerUpiID(state, payload) {
    const refID = payload.refID;
    const customerUPIID = payload.customerUPIID;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].customerUPIID = customerUPIID;
  },
  updateCustomerUtr(state, payload) {
    const refID = payload.refID;
    const customerUtr = payload.customerUtr;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].customerUtr = customerUtr;
  },
  updateCustomerUtrAndAttachment(state, payload) {
    const refID = payload.refID;
    const customerUtr = payload.customerUtr;
    const uploadScreenshot = payload.uploadScreenshot;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].customerUtr = customerUtr;
    state.payInList[order].upload_screenshot = uploadScreenshot;
  },
  updateAmountAndStatus(state, payload) {
    const refID = payload.refID;
    const amount = payload.amount;
    const paymentStatus = payload.paymentStatus;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].amount = amount;
    state.payInList[order].paymentStatus = paymentStatus;
  },
  updatePayOutAmountAndStatus(state, payload) {
    const refID = payload.refID;
    const amount = payload.amount;
    const paymentStatus = payload.paymentStatus;
    const accountNumber = payload.accountNumber;
    const ifsc = payload.ifsc;
    const bankName = payload.bankName;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].amount = amount;
    state.payInList[order].paymentStatus = paymentStatus;
    state.payInList[order].accountNumber = accountNumber;
    state.payInList[order].ifsc = ifsc;
    state.payInList[order].bankName = bankName;
  },
  updateStatusAndTransaction(state, payload) {
    const refID = payload.refID;
    const transactionID = payload.transactionID;
    const paymentStatus = payload.paymentStatus;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].transactionID = transactionID;
    state.payInList[order].paymentStatus = paymentStatus;
  },
  updatePayoutLinkOrder(state, payload) {
    const refID = payload.refID;
    const isApprovedByMOU = payload.isApprovedByMOU;
    const paymentStatus = payload.paymentStatus;
    const order = state.payInList.findIndex(req => req.refID === refID);
    state.payInList[order].isApprovedByMOU = isApprovedByMOU;
    state.payInList[order].paymentStatus = paymentStatus;
  }
};

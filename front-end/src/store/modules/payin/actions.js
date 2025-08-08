import http from '../../../http-common.js';

export default {
  async getPayInList(context, params) {
    const username = context.rootGetters.username;
    const role = context.rootGetters.role;

    let url = `/orders`;

    let questionMark = '?';

    if (role == 'user') {
      url += `${questionMark}validatorUsername=${username}`;
      questionMark = '&';
    }

    if (params.type) {
      url += `${questionMark}type=${params.type}`;
      questionMark = '&';
    }

    if (params.payoutType) {
      url += `${questionMark}payout_type=${params.payoutType}`;
    }

    if (params.transactionType) {
      url += `${questionMark}transactionType=${params.transactionType}`;
      questionMark = '&';
    }

    if (params.created_by) {
      url += `${questionMark}created_by=${params.created_by}`;
      questionMark = '&';
    }

    if (params.amount) {
      url += `${questionMark}amount=${params.amount}`;
      questionMark = '&';
    }

    if (params.paymentStatus) {
      url += `${questionMark}paymentStatus=${params.paymentStatus}`;
      questionMark = '&';
    }

    if (params.validatorUsername) {
      url += `${questionMark}validatorUsername=${params.validatorUsername}`;
      questionMark = '&';
    }

    if (params.searchKeyWord) {
      url += `${questionMark}searchKeyWord=${params.searchKeyWord}&advanceSearch=${params.advanceSearch}`;
      questionMark = '&';
    }

    if (params.startDate && params.endDate) {
      url += `${questionMark}startDate=${params.startDate}&endDate=${params.endDate}`;
      questionMark = '&';
    }

    url += `${questionMark}first=${params.first}&page=${params.page}`;

    const response = await http.get(url);

    if (response.status == 200) {
      const responseData = response.data.data;
      const pagination = response.data.pagination;
      context.commit('setPayInList', responseData);
      context.commit('setPagination', pagination);
    } else {
      const error = new Error('Unauthorized: You are not an admin.');
      throw error;
    }
  },
  async approveOrder(context, payload) {
    const refID = payload.refID;
    const data = JSON.stringify({
      transactionID: payload.transactionID
    });

    try {
      const response = await http.post(`/orders/${refID}`, data);

      if (response.status == 200) {
        context.commit('setPaymentStatusAndUtr', payload);
      } else {
        const error = new Error('Something went wrong!');
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || 'Something failed!'
      );
      throw errorMessage;
    }
  },
  async approvePayOutOrder(context, payload) {
    const refID = payload.refID;
    let data = {
      paymentStatus: payload.paymentStatus,
      transactionID: payload.transactionID
    };

    if (
      typeof payload.instant_balance !== undefined &&
      typeof payload.payout_type !== undefined
    ) {
      if (payload.payout_type == 'instant') {
        data.payout_type = 'instant';
      }
      data.instant_balance = payload.instant_balance;
    }

    data = JSON.stringify(data);

    try {
      const response = await http.post(
        `/orders/${refID}/approvePayOutOrder`,
        data
      );
      if (response.status == 200) {
        context.commit('setPayOutOrderPaymentStatus', payload);
      } else {
        const error = new Error('Something went wrong!');
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || 'Something failed!'
      );
      throw errorMessage;
    }
  },
  async getOrderStatics(context, params) {
    try {
      const response = await http.get(
        `/orders/getOrderStatics/${params.type}?selectedDay=${params.selectedDay}&website=${params.website}&startDate=${params.startDate}&endDate=${params.endDate}&vendor=${params.vendor}&orderCreator=${params.orderCreator}`
      );
      if (response.status == 200) {
        let payinArr = [];
        let payoutArr = [];

        const responseData = response.data.data;

        responseData.forEach(obj => {
          if (obj.type === 'payin') {
            const arrObj = {
              paymentStatus: obj.paymentStatus,
              count: obj.count,
              totalAmount: obj.total_amount,
              totalDiffAmount: obj.total_diff_amount
            };
            payinArr.push(arrObj);
          } else if (obj.type === 'payout') {
            const arrObj = {
              paymentStatus: obj.paymentStatus,
              count: obj.count,
              totalAmount: obj.total_amount
            };
            payoutArr.push(arrObj);
          }
        });

        context.commit('setPayInOrderStatics', payinArr);
        context.commit('setPayOutOrderStatics', payoutArr);
      } else {
        const error = new Error('Something went wrong!');
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || 'Something failed!'
      );
      throw errorMessage;
    }
  },
  async getBarChartData(context, params) {
    try {
      const response = await http.get(
        `/orders/getBarChartData/${params.type}?selectedDay=${params.selectedDay}&website=${params.website}&startDate=${params.startDate}&endDate=${params.endDate}&paymentType=${params.paymentType}&vendor=${params.vendor}&orderCreator=${params.orderCreator}`
      );
      if (response.status == 200) {
        const data = response.data.data;

        let series = [];
        let paymentStatusData = {};

        // Loop through data and create an object to hold the data for each payment status
        for (let i = 0; i < data.length; i++) {
          let paymentStatus = data[i].paymentStatus;
          if (
            !Object.prototype.hasOwnProperty.call(
              paymentStatusData,
              paymentStatus
            )
          ) {
            paymentStatusData[paymentStatus] = {
              name:
                paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1),
              data: Array.from({ length: 24 }).fill(0)
            };
          }
        }

        // Loop through hours and add the total amount for each payment status to the corresponding hour in the data array
        for (let i = 0; i < 24; i++) {
          for (let j = 0; j < data.length; j++) {
            let paymentStatus = data[j].paymentStatus;
            let hour = data[j].hour;
            let totalAmount = parseFloat(data[j].totalAmount);
            if (i === hour) {
              paymentStatusData[paymentStatus].data[i] += totalAmount;
            }
          }
        }

        // Push the data for each payment status into the series array
        for (let paymentStatus in paymentStatusData) {
          if (paymentStatus == 'approved') {
            series.push(paymentStatusData[paymentStatus]);
          }
        }

        context.commit('setBarChartDataSeries', series);
      } else {
        const error = new Error('Something went wrong!');
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || 'Something failed!'
      );
      throw errorMessage;
    }
  }
};

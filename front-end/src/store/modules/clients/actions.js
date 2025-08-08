import http from '../../../http-common.js';

export default {
  async getClients(context) {
    try {
      const response = await http.get('/clients');
      if (response.status == 200) {
        const count = response.data.count;
        const responseData = response.data.clients;
        context.commit('setClients', responseData);
        context.commit('setClientsCount', count);
      } else {
        const error = new Error('Something went wrong!');
        throw error;
      }
    } catch (error) {
      const errorMessage = {
        status: error.response.data.success,
        message: new Error(error.response.data.message || 'Something failed!')
      };
      throw errorMessage;
    }
  },
  async createClient(context, data) {
    let clientData;
    try {
      const response = await http.put('/clients', data);
      if (response.status == 201) {
        clientData = {
          clientName: data.clientName,
          secret: data.secret,
          xKey: data.xKey,
          callbackURL: data.callbackURL,
          payOutCallbackURL: data.payOutCallbackURL,
          failedOrderCallbackURL: data.failedOrderCallbackURL,
          is_instant_payout: data.is_instant_payout,
          wallet_callback: data.walletCallbackURL,
          instant_payout_limit: data.instant_payout_limit
        };
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

    context.commit('addClient', clientData);
  },
  async updateClient(context, data) {
    const clientName = data.clientName;
    delete data.clientName;
    let clientData;
    try {
      const response = await http.post(`/clients/${clientName}`, data);
      if (response.status == 200) {
        clientData = {
          clientName: clientName,
          secret: data.secret,
          xKey: data.xKey,
          callbackURL: data.callbackURL,
          payOutCallbackURL: data.payOutCallbackURL,
          failedOrderCallbackURL: data.failedOrderCallbackURL,
          is_instant_payout: data.is_instant_payout,
          wallet_callback: data.walletCallbackURL,
          instant_payout_limit: data.instant_payout_limit
        };
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

    context.commit('updateClient', clientData);
  }
};

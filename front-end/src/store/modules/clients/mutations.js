export default {
  setClients(state, payload) {
    state.clients = payload;
  },
  setClientsCount(state, count) {
    state.clientsCount = count;
  },
  addClient(state, payload) {
    state.clients.unshift(payload);
  },
  updateClient(state, payload) {
    const index = state.clients.findIndex(
      item => item.clientName === payload.clientName
    );
    state.clients[index] = payload;
  }
};

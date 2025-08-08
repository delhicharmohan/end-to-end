export default {
  clients(state) {
    return state.clients;
  },
  clientsCount(state) {
    return state.clientsCount;
  },
  hasClients(_, getters) {
    return getters.clientsCount > 0;
  },
};

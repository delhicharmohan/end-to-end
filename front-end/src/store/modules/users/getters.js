export default {
  users(state) {
    return state.users;
  },
  hasUsers(_, getters) {
    return getters.users && getters.users.length > 0;
  },
  pagination(state) {
    return state.pagination;
  },
};

export default {
  setUsers(state, payload) {
    state.users = payload;
  },
  addUser(state, payload) {
    state.users.unshift(payload);
  },
  updateUser(state, payload) {
    const index = state.users.findIndex(
      (item) => item.username === payload.username
    );
    state.users[index] = payload;
  },
  deleteUser(state, username) {
    const index = state.users.findIndex((item) => item.username === username);
    state.users.splice(index, 1);
  },
  changeUserStatus(state, payload) {
    const index = state.users.findIndex(
      (item) => item.username === payload.username
    );
    state.users[index].status = payload.status;
  },
};

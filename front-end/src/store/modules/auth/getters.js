export default {
  username(state) {
    return state.username;
  },
  role(state) {
    return state.role;
  },
  vendor(state) {
    return state.vendor;
  },
  payInStatus(state) {
    return state.payInStatus;
  },
  payOutStatus(state) {
    return state.payOutStatus;
  },
  token(state) {
    return state.token;
  },
  isAuthenticated(state) {
    return !!state.token;
  },
  didAutoLogout(state) {
    return state.didAutoLogout;
  },
  isAdmin(state) {
    return state.role == "admin";
  },
  isSubAdmin(state) {
    return state.role == "subadmin";
  },
  isSuperAdmin(state) {
    return state.role == "superadmin";
  },
  isUser(state) {
    return state.role == "user";
  },
  isOrderCreator(state) {
    return state.role == "order_creator";
  },
  isSupport(state) {
    return state.role == "support";
  },
};

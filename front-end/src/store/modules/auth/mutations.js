export default {
  setUser(state, payload) {
    state.token = payload.token;
    state.username = payload.username;
    state.role = payload.role;
    state.vendor = payload.vendor;
    state.payInStatus = payload.payInStatus;
    state.payOutStatus = payload.payOutStatus;
    state.exp = payload.exp;
    state.iat = payload.iat;
    state.didAutoLogout = false;
  },
  setAutoLogout(state) {
    state.token = null;
    state.didAutoLogout = true;
  },
};

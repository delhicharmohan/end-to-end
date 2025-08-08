import mutations from "./mutations.js";
import actions from "./actions.js";
import getters from "./getters.js";

export default {
  state() {
    return {
      token: null,
      didAutoLogout: false,
      username: null,
      role: null,
      vendor: null,
      payInStatus: null,
      payOutStatus: null,
      exp: null,
      iat: null,
    };
  },
  mutations,
  actions,
  getters,
};

import http from "../../../http-common.js";
import jwt_decode from "jwt-decode";

let timer;

export default {
  async login(context, payload) {
    const data = JSON.stringify({
      username: payload.username,
      password: payload.password,
    });

    const response = await http.post("/login", data);

    if (response.status == 200) {
      const responseData = response.data;

      const decoded = jwt_decode(responseData.token);

      const username = decoded.username;
      const role = decoded.role;
      const vendor = decoded.vendor;
      const payInStatus = decoded.payInStatus;
      const payOutStatus = decoded.payOutStatus;
      const exp = decoded.exp;
      const iat = decoded.iat;

      // const expiresIn = (exp - iat) * 1000;
      const expiresIn = 1800000;
      const expirationDate = new Date().getTime() + expiresIn;
      localStorage.setItem("tokenExpiration", expirationDate);

      localStorage.setItem("token", responseData.token);
      localStorage.setItem("username", username);
      localStorage.setItem("role", role);
      localStorage.setItem("vendor", vendor);
      localStorage.setItem("payInStatus", payInStatus);
      localStorage.setItem("payOutStatus", payOutStatus);
      localStorage.setItem("exp", exp);
      localStorage.setItem("iat", iat);
      timer = setTimeout(function() {
        context.dispatch("autoLogout");
      }, expiresIn);
      context.commit("setUser", {
        token: responseData.token,
        username: username,
        role: role,
        vendor: vendor,
        payInStatus: payInStatus,
        payOutStatus: payOutStatus,
        exp: exp,
        iat: iat,
      });
    } else {
      const error = new Error("Failed to authenticate. Check your login data.");
      throw error;
    }
  },
  tryLogin(context) {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const vendor = localStorage.getItem("vendor");
    const payInStatus = localStorage.getItem("payInStatus");
    const payOutStatus = localStorage.getItem("payOutStatus");
    const exp = localStorage.getItem("exp");
    const iat = localStorage.getItem("iat");

    const tokenExpiration = localStorage.getItem("tokenExpiration");
    const expiresIn = +tokenExpiration - new Date().getTime();

    // const expiresIn = exp * 1000 - new Date().getTime();

    if (expiresIn < 0) {
      return;
    }

    timer = setTimeout(function() {
      context.dispatch("autoLogout");
    }, expiresIn);

    if (token && username) {
      context.commit("setUser", {
        token: token,
        username: username,
        role: role,
        vendor: vendor,
        payInStatus: payInStatus,
        payOutStatus: payOutStatus,
        exp: exp,
        iat: iat,
      });
    }
  },
  async logout(context) {
    const response = await http.post("/logout");

    if (response.status == 200) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("vendor");
      localStorage.removeItem("payInStatus");
      localStorage.removeItem("payOutStatus");
      localStorage.removeItem("exp");
      localStorage.removeItem("iat");

      localStorage.removeItem("tokenExpiration");

      clearTimeout(timer);

      context.commit("setUser", {
        token: null,
        username: null,
        role: null,
        vendor: null,
        payInStatus: null,
        payOutStatus: null,
        exp: null,
        iat: null,
      });
    } else {
      const error = new Error("Failed to logout. Check your cookie.");
      throw error;
    }
  },
  autoLogout(context) {
    context.dispatch("logout");
    context.commit("setAutoLogout");
  },
};

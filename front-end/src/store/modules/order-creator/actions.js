import http from "../../../http-common.js";

export default {
  async getUsers(context) {
    try {
      const response = await http.get("/order-creator");

      if (response.status == 200) {
        const responseData = response.data;
        context.commit("setUsers", responseData);
      } else {
        const error = new Error("Something went wrong!");
        throw error;
      }
    } catch (error) {
      const errorMessage = {
        status: error.response.data.success,
        message: new Error(error.response.data.message || "Something failed!"),
      };
      throw errorMessage;
    }
  },
  async createUser(context, data) {
    let userData;
    try {
      const response = await http.post("/order-creator", data);
      if (response.status == 201) {
        userData = {
          username: data.username,
          password: data.password,
          role: data.role,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: 1,
          isLoggedIn: 0,
          payIn: data.payIn,
          payOut: data.payOut,
        };
      } else {
        const error = new Error("Something went wrong!");
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || "Something failed!"
      );
      throw errorMessage;
    }

    context.commit("addUser", userData);
  },
  async updateUser(context, data) {
    const username = data.username;
    const status = data.status;
    delete data.username;
    delete data.status;
    let userData;
    try {
      const response = await http.put(`/order-creator/${username}`, data);
      if (response.status == 200) {
        userData = {
          username: username,
          password: data.password ? data.password : "",
          role: data.role,
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: status,
          payIn: data.payIn,
          payOut: data.payOut,
        };
      } else {
        const error = new Error("Something went wrong!");
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || "Something failed!"
      );
      throw errorMessage;
    }

    context.commit("updateUser", userData);
  },
  async deleteUser(context, user) {
    const username = user.username;

    try {
      const response = await http.delete(`/order-creator/${username}`);
      if (response.status == 200) {
        context.commit("deleteUser", username);
      } else {
        const error = new Error("Something went wrong!");
        throw error;
      }
    } catch (error) {
      const errorMessage = new Error(
        error.response.data.message || "Something failed!"
      );
      throw errorMessage;
    }
  },
};

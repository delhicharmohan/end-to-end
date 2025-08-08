import http from "../../../http-common.js";

export default {
  async getUsers(context, params) {
    try {

      let url = `/users`;

      let questionMark = "?";

      if (params.first) {
        url += `${questionMark}first=${params.first}`;
        questionMark = "&";
      }
  
      if (params.page) {
        url += `${questionMark}page=${params.page}`;
        questionMark = "&";
      }

      const response = await http.get(url);

      if (response.status == 200) {
        const responseData = response.data.data;
        const pagination = response.data.pagination;
        const users = [];
        for (const key in responseData) {
          const user = {
            username: responseData[key].username,
            role: responseData[key].role,
            status: responseData[key].status,
            upiId: responseData[key].upiid,
            name: responseData[key].name,
            email: responseData[key].email,
            phone: responseData[key].phone,
            payIn: responseData[key].payIn,
            payOut: responseData[key].payOut,
            payInLimit: responseData[key].payInLimit,
            payOutLimit: responseData[key].payOutLimit,
            balance: responseData[key].balance,
            payInCommission: responseData[key].payInCommission,
            payOutCommission: responseData[key].payOutCommission,
            isLoggedIn: responseData[key].isLoggedIn,
            approvedCount: responseData[key].approvedCount,
            approvedAmount: responseData[key].approvedAmount,
            pendingCount: responseData[key].pendingCount,
            pendingAmount: responseData[key].pendingAmount,
            website: responseData[key].website,
            is_utr_enabled: responseData[key].is_utr_enabled,
            isPayNow: responseData[key].isPayNow ? true : false,
            paymentMethod: responseData[key].paymentMethod,
            merchantCode: responseData[key].merchantCode,
            merchantName: responseData[key].merchantName,
            uniqueIdentifier: responseData[key].uniqueIdentifier,
            accountHolderName: responseData[key].accountHolderName,
            accountNumber: responseData[key].accountNumber,
            ifsc: responseData[key].ifsc,
            bankName: responseData[key].bankName,
            extensionId: responseData[key].extensionId,
            qr: responseData[key].qr,
          };
          users.push(user);
        }
        context.commit("setUsers", users);
        context.commit("setPagination", pagination);
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
    const qrPreview = data.qrPreview;
    delete data.qrPreview;
    delete data.qr;
    let userData;
    try {
      const response = await http.put("/users", data, {
        headers: {
        'Content-Type': 'multipart/form-data',
        },
      });
      if (response.status == 201) {
        userData = {
          username: data.username,
          password: data.password,
          upiId: data.upiid,
          role: data.role,
          name: data.name,
          email: data.email,
          phone: data.phone,
          payIn: data.payIn,
          payOut: data.payOut,
          payInLimit: data.payInLimit,
          payOutLimit: data.payOutLimit,
          balance: data.balance,
          payInCommission: data.payInCommission,
          payOutCommission: data.payOutCommission,
          website: data.website,
          is_utr_enabled: data.is_utr_enabled,
          isPayNow: data.isPayNow ? true : false,
          status: 0,
          paymentMethod: data.paymentMethod,
          merchantCode: data.merchantCode,
          merchantName: data.merchantName,
          uniqueIdentifier: data.uniqueIdentifier,
          accountNumber: data.accountNumber,
          accountHolderName: data.accountHolderName,
          ifsc: data.ifsc,
          bankName: data.bankName,
          extensionId: data.extensionId,
          qr: qrPreview,
          approvedCount: 0,
          approvedAmount: 0,
          pendingCount: 0,
          pendingAmount: 0,
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
    const qrPreview = data.qrPreview;
    delete data.username;
    delete data.status;
    delete data.qrPreview;
    delete data.qr;
    let userData;
    try {
      const response = await http.post(`/users/${username}`, data, {
        headers: {
        'Content-Type': 'multipart/form-data',
        },
    });
      if (response.status == 200) {
        
        const updatedUser = context.getters.users.find(obj => obj.username === username);

        userData = {
          username: username,
          password: data.password ? data.password : "",
          upiId: data.upiid,
          role: data.role,
          name: data.name,
          email: data.email,
          phone: data.phone,
          payIn: data.payIn,
          payOut: data.payOut,
          payInLimit: data.payInLimit,
          payOutLimit: data.payOutLimit,
          balance: data.balance,
          payInCommission: data.payInCommission,
          payOutCommission: data.payOutCommission,
          website: data.website,
          is_utr_enabled: data.is_utr_enabled,
          isPayNow: data.isPayNow ? true : false,
          status: status,
          paymentMethod: data.paymentMethod,
          merchantCode: data.merchantCode,
          merchantName: data.merchantName,
          uniqueIdentifier: data.uniqueIdentifier,
          accountNumber: data.accountNumber,
          accountHolderName: data.accountHolderName,
          ifsc: data.ifsc,
          bankName: data.bankName,
          extensionId: data.extensionId,
          qr: qrPreview,
          approvedCount: updatedUser.approvedCount,
          approvedAmount: updatedUser.approvedAmount,
          pendingCount: updatedUser.pendingCount,
          pendingAmount: updatedUser.pendingAmount,
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
      const response = await http.delete(`/users/${username}`);
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

  async changeUserStatus(context, user) {
    const username = user.username;
    const status = user.status;

    const data = {
      status: status,
    };

    try {
      const response = await http.post(`/users/${username}/status`, data);
      if (response.status == 200) {
        const payload = {
          username: username,
          status: status,
        };
        context.commit("changeUserStatus", payload);
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

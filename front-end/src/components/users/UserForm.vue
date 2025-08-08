<template>
  <form
    @submit.prevent="submitForm"
    class="flex flex-row flex-wrap px-4 mt-4 mb-4"
  >
    <h1 class="w-full text-lg font-medium">Bio Data</h1>
    <div
      class="w-full flex flex-row flex-wrap mt-4 border p-8 rounded-xl shadow-lg"
    >
      <div class="w-1/2 pr-4" :class="{ invalid: !name.isValid }">
        <label for="name">Name</label>
        <input
          type="text"
          id="name"
          v-model.trim="name.val"
          @blur="clearValidity('name')"
        />
        <p v-if="!name.isValid" class="text-xs text-red-600">
          Name must not be empty.
        </p>
      </div>
      <div class="w-1/2 pl-4" :class="{ invalid: !username.isValid }">
        <label for="username">Username</label>
        <div
          v-if="mode == 'update'"
          class="border rounded-lg px-4 py-2 bg-gray-100"
        >
          {{ username.val }}
        </div>
        <input
          v-else
          type="text"
          id="username"
          v-model.trim="username.val"
          @blur="clearValidity('username')"
        />
        <p v-if="!username.isValid" class="text-xs text-red-600">
          Username must not be empty.
        </p>
      </div>
      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !email.isValid }">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          v-model.trim="email.val"
          @blur="clearValidity('email')"
        />
        <p v-if="!email.isValid" class="text-xs text-red-600">
          Email must not be empty.
        </p>
      </div>
      <div class="mt-4 w-1/2 pl-4" :class="{ invalid: !phone.isValid }">
        <label for="phone">Phone</label>
        <input
          type="text"
          id="phone"
          v-model.trim="phone.val"
          maxlength="10"
          @blur="clearValidity('phone')"
          @keypress="isNumber($event)"
        />
        <p v-if="!phone.isValid" class="text-xs text-red-600">
          {{ phone.msg }}
        </p>
      </div>
      <div class="mt-4 w-1/2 pr-4" :class="{ invalid: !password.isValid }">
        <label for="password">Password</label>
        <input
          type="text"
          id="password"
          v-model.trim="password.val"
          @blur="clearValidity('password')"
        />
        <p v-if="!password.isValid" class="text-xs text-red-600">
          Password must not be empty.
        </p>
      </div>
    </div>

    <h1 class="w-full text-lg font-medium mt-8">Payment Data</h1>
    <div
      class="w-full grid grid-cols-2 gap-8 mt-4 border p-8 rounded-xl shadow-lg"
    >
      <div
        class="w-full"
        :class="{ invalid: !paymentMethod.isValid }"
      >
        <label for="paymentMethod">Payment Method</label>
        <select
          id="paymentMethod"
          v-model.trim="paymentMethod.val"
          @blur="clearValidity('paymentMethod')"
        >
          <option value="UPI">UPI</option>
          <option value="Manual Bank">Manual Bank</option>
          <option value="Automatic Payment">Automatic Payment with APP</option>
          <option value="automatic_payment_with_sms">Automatic Payment with SMS</option>
          <option value="automatic_payment_with_extension">Automatic Payment with Chrome Extension</option>
          <option value="static_qr">Static QR</option>
          <option value="chrome_extension_with_decimal">Chrome Extension with Decimal</option>
        </select>
        <p v-if="!paymentMethod.isValid" class="text-xs text-red-600">
          You must select a payment method
        </p>
      </div>
      <div v-if="paymentMethod.val === 'UPI' || paymentMethod.val === 'Automatic Payment' || paymentMethod.val === 'automatic_payment_with_sms'" class="w-full" :class="{ invalid: !upiId.isValid }">
        <label for="upi-id">UPI ID</label>
        <input
          type="text"
          id="upi-id"
          v-model.trim="upiId.val"
          @blur="clearValidity('upiId')"
        />
        <p v-if="!upiId.isValid" class="text-xs text-red-600">
          UPI Id must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'Automatic Payment'" class="w-full" :class="{ invalid: !merchantCode.isValid }">
        <label for="merchantCode">Merchant Code</label>
        <input
          type="text"
          id="merchantCode"
          v-model.trim="merchantCode.val"
          @blur="clearValidity('merchantCode')"
        />
        <p v-if="!merchantCode.isValid" class="text-xs text-red-600">
          Merchant Code must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'Automatic Payment'" class="w-full" :class="{ invalid: !merchantName.isValid }">
        <label for="merchantName">Merchant Name</label>
        <input
          type="text"
          id="merchantName"
          v-model.trim="merchantName.val"
          @blur="clearValidity('merchantName')"
        />
        <p v-if="!merchantName.isValid" class="text-xs text-red-600">
          Merchant Name must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'automatic_payment_with_sms'" class="w-full" :class="{ invalid: !uniqueIdentifier.isValid }">
        <label for="uniqueIdentifier">Unique Identifier</label>
        <input
          type="text"
          id="uniqueIdentifier"
          v-model.trim="uniqueIdentifier.val"
          @blur="clearValidity('uniqueIdentifier')"
        />
        <p v-if="!uniqueIdentifier.isValid" class="text-xs text-red-600">
          Unique Identifier must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'Manual Bank'" class="w-full" :class="{ invalid: !accountHolderName.isValid }">
        <label for="accountHolderName">Account Holder Name</label>
        <input
          type="text"
          id="accountHolderName"
          v-model.trim="accountHolderName.val"
          @blur="clearValidity('accountHolderName')"
        />
        <p v-if="!accountHolderName.isValid" class="text-xs text-red-600">
          Account Holder Name must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'Manual Bank' || paymentMethod.val === 'automatic_payment_with_extension' || paymentMethod.val === 'chrome_extension_with_decimal'" class="w-full" :class="{ invalid: !accountNumber.isValid }">
        <label for="accountNumber">Account Number</label>
        <input
          type="text"
          id="accountNumber"
          v-model.trim="accountNumber.val"
          @blur="clearValidity('accountNumber')"
        />
        <p v-if="!accountNumber.isValid" class="text-xs text-red-600">
          Account Number must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'Manual Bank'" class="w-full" :class="{ invalid: !ifsc.isValid }">
        <label for="ifsc">IFSC</label>
        <input
          type="text"
          id="ifsc"
          v-model.trim="ifsc.val"
          @blur="clearValidity('ifsc')"
        />
        <p v-if="!ifsc.isValid" class="text-xs text-red-600">
          IFSC must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'Manual Bank'" class="w-full" :class="{ invalid: !bankName.isValid }">
        <label for="bankName">Bank Name</label>
        <input
          type="text"
          id="bankName"
          v-model.trim="bankName.val"
          @blur="clearValidity('bankName')"
        />
        <p v-if="!bankName.isValid" class="text-xs text-red-600">
          Bank Name must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'automatic_payment_with_extension' || paymentMethod.val === 'chrome_extension_with_decimal'" class="w-full" :class="{ invalid: !extensionId.isValid }">
        <label for="extensionId">Extension ID</label>
        <input
          type="text"
          id="extensionId"
          v-model.trim="extensionId.val"
          @blur="clearValidity('extensionId')"
        />
        <p v-if="!extensionId.isValid" class="text-xs text-red-600">
          Extension ID must not be empty.
        </p>
      </div>
      <div v-if="paymentMethod.val === 'static_qr'" class="w-full">
        <div class="flex-shrink-0">
            <div v-if="qrPreview" class="relative">
                <div @click.stop="cancelUploadedPhoto" class="absolute top-0 left-0 cursor-pointer h-6 w-6 border border-red-600 rounded-full flex flex-col items-center justify-center">
                    <icon-close class="h-4 w-4 text-red-600"></icon-close>
                </div>
                <img class="h-48 object-contain" :src="qrPreview" >
            </div>
            <img v-else class="h-48" src="../../assets/images/default/thumbnail.jpeg" >
            <div class="flex justify-start mt-4">
                <input ref="qrPicture" class="hidden" id="profile-picture" @change="handleUploadedPhoto" type="file" accept="image/*">
                <div @click.stop="onPickFile('qrPicture')" :class="qrPicture.isValid ? 'text-twelve' : 'text-red-600'" class="flex items-center cursor-pointer">
                    <icon-plus class="h-4 w-4"></icon-plus>
                    <span class="ml-1">Upload QR*<span class="text-sm text-secondary ml-1">(JPG, JPEG, PNG max 2MB)</span></span>
                </div>
            </div>
            <transition name="fade" mode="out-in">
                <p v-if="!qrPicture.isValid" class="h-4 text-xs text-red-600">
                    {{ qrPicture.msg }}
                </p>
            </transition>
        </div>
      </div>
    </div>

    <h1 class="w-full text-lg font-medium mt-8">Operations Data</h1>
    <div
      class="w-full grid grid-cols-2 gap-8 mt-4 border p-8 rounded-xl shadow-lg"
    >
      <div class="w-full" :class="{ invalid: !openingBalance.isValid }">
        <label for="opening-balance">Opening Balance</label>
        <input
          type="number"
          id="opening-balance"
          v-model.trim="openingBalance.val"
          min="0"
          @blur="clearValidity('openingBalance')"
        />
        <p v-if="!openingBalance.isValid" class="text-xs text-red-600">
          Opening Balance must not be empty.
        </p>
      </div>
      <div class="w-full">
        <label for="website">Website</label>
        <select id="website" v-model.trim="website.val">
          <option value="">Select a website</option>
          <option
            v-for="(w, index) in websites"
            :key="index"
            :value="w.website"
            >{{ w.website }}</option
          >
        </select>
      </div>
      <div
        class="w-full"
        :class="{ invalid: !payInCommissionPercentage.isValid }"
      >
        <label for="pay-in-commission-percentage"
          >Pay In Commission Percentage</label
        >
        <input
          type="number"
          id="pay-in-commission-percentage"
          v-model.trim="payInCommissionPercentage.val"
          min="0"
          @blur="clearValidity('payInCommissionPercentage')"
        />
        <p v-if="!payInCommissionPercentage.isValid" class="text-xs text-red-600">
          Pay In Commission Percentage must not be empty.
        </p>
      </div>
      <div
        class="w-full"
        :class="{ invalid: !payOutCommissionPercentage.isValid }"
      >
        <label for="pay-out-commission-percentage"
          >Pay Out Commission Percentage</label
        >
        <input
          type="number"
          id="pay-out-commission-percentage"
          v-model.trim="payOutCommissionPercentage.val"
          min="0"
          @blur="clearValidity('payOutCommissionPercentage')"
        />
        <p v-if="!payOutCommissionPercentage.isValid" class="text-xs text-red-600">
          Pay Out Commission Percentage must not be empty.
        </p>
      </div>
      <div class="w-full" :class="{ invalid: !payIn.isValid }">
        <label for="pay-in">Pay In</label>
        <input type="checkbox" id="pay-in" v-model.trim="payIn.val" />
      </div>
      <div class="w-full" :class="{ invalid: !payOut.isValid }">
        <label for="pay-out">Pay Out</label>
        <input type="checkbox" id="pay-out" v-model.trim="payOut.val" />
      </div>

      <div class="w-full" :class="{ invalid: !payInLimit.isValid }">
        <label for="pay-in-limit">Pay In Limit</label>
        <input
          type="number"
          id="pay-in-limit"
          v-model.trim="payInLimit.val"
          min="0"
          @blur="clearValidity('payInLimit')"
        />
        <p v-if="!payInLimit.isValid" class="text-xs text-red-600">
          Pay In Limit must not be empty.
        </p>
      </div>
      <div class="w-full" :class="{ invalid: !payOutLimit.isValid }">
        <label for="pay-out-limit">Pay Out Limit</label>
        <input
          type="number"
          id="pay-out-limit"
          v-model.trim="payOutLimit.val"
          min="0"
          @blur="clearValidity('payOutLimit')"
        />
        <p v-if="!payOutLimit.isValid" class="text-xs text-red-600">
          Pay Out Limit must not be empty.
        </p>
      </div>
      <div
        class="w-full"
        :class="{ invalid: !is_utr_enabled.isValid }"
      >
        <label for="is_utr_enabled">Enable UTR</label>
        <select
          id="is_utr_enabled"
          v-model.trim="is_utr_enabled.val"
          @blur="clearValidity('is_utr_enabled')"
        >
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
        <p v-if="!is_utr_enabled.isValid" class="text-xs text-red-600">
          Enable UTR must not be empty.
        </p>
      </div>
      <div class="flex justify-between items-center pt-7">
        <div class="wd-200">
          Pay Now Button:
          <span :class="isPayNow? 'text-green-600': 'text-red-600'">{{ isPayNow ? "Enabled" : "Disabled" }}</span>
        </div>
        <base-toggle
          class="mb-0"
          :is-checked="isPayNow"
          @rsd-checkbox-changed="changeIsPayNow"
        ></base-toggle>
      </div>
    </div>
    <div class="w-full flex flex-col justify-center items-center mt-8">
      <p v-if="!formIsValid" class="mb-4 text-red-600">
        Please fix the above errors and submit again.
      </p>
      <base-button
        ><span class="capitalize">{{ mode }}</span></base-button
      >
    </div>
  </form>
</template>

<script>
import http from "../../http-common.js";
import IconClose from "../../components/icons/IconClose.vue";
import IconPlus from "../../components/icons/IconPlus.vue";
export default {
  name: "create-user-form",
  emits: ["create-user"],
  props: ["mode", "selectedUser"],
  components: {
    IconClose,
    IconPlus,
  },
  mounted() {
    if (this.mode == "update") {
      this.setUser();
    }
  },
  created() {
    this.getWebsites();
  },
  data() {
    return {
      name: {
        val: "",
        isValid: true,
        msg: "",
      },
      username: {
        val: "",
        isValid: true,
        msg: "",
      },
      email: {
        val: "",
        isValid: true,
        msg: "",
      },
      phone: {
        val: "",
        isValid: true,
        msg: "",
      },
      password: {
        val: "",
        isValid: true,
        msg: "",
      },
      upiId: {
        val: "",
        isValid: true,
        msg: "",
      },
      openingBalance: {
        val: 0,
        isValid: true,
        msg: "",
      },
      payInCommissionPercentage: {
        val: 0,
        isValid: true,
        msg: "",
      },
      payOutCommissionPercentage: {
        val: 0,
        isValid: true,
        msg: "",
      },
      payIn: {
        val: false,
        isValid: true,
        msg: "",
      },
      payOut: {
        val: false,
        isValid: true,
        msg: "",
      },
      payInLimit: {
        val: 0,
        isValid: true,
        msg: "",
      },
      payOutLimit: {
        val: 0,
        isValid: true,
        msg: "",
      },
      website: {
        val: "",
        isValid: true,
        msg: "",
      },
      is_utr_enabled: {
        val: 0,
        isValid: true,
        msg: "",
      },
      isPayNow: false,
      paymentMethod: {
        val: "UPI",
        isValid: true,
        msg: "",
      },
      merchantCode: {
        val: "",
        isValid: true,
        msg: "",
      },
      merchantName: {
        val: "",
        isValid: true,
        msg: "",
      },
      uniqueIdentifier: {
        val: "",
        isValid: true,
        msg: "",
      },
      accountNumber: {
        val: "",
        isValid: true,
        msg: "",
      },
      accountHolderName: {
        val: "",
        isValid: true,
        msg: "",
      },
      ifsc: {
        val: "",
        isValid: true,
        msg: "",
      },
      bankName: {
        val: "",
        isValid: true,
        msg: "",
      },
      extensionId: {
        val: "",
        isValid: true,
        msg: "",
      },
      qrPicture: {
          val: null,
          isValid: true,
          msg: "",
      },
      qrPreview: null,
      formIsValid: true,
      websites: [],
    };
  },
  methods: {
    clearValidity(input) {
      this[input].isValid = true;
      this[input].msg = "";
    },
    validateForm() {
      this.formIsValid = true;

      if (this.mode == "create") {
        if (this.username.val === "") {
          this.username.isValid = false;
          this.formIsValid = false;
        }
        if (this.password.val === "") {
          this.password.isValid = false;
          this.formIsValid = false;
        }
      }

      if (this.name.val === "") {
        this.name.isValid = false;
        this.formIsValid = false;
      }
      if (this.email.val === "") {
        this.email.isValid = false;
        this.formIsValid = false;
      }
      if (this.phone.val === "") {
        this.phone.isValid = false;
        this.phone.msg = "Phone must not be empty.";
        this.formIsValid = false;
      } else if (this.phone.val.length < 10) {
        this.phone.isValid = false;
        this.phone.msg = "Phone number must be 10 digits.";
        this.formIsValid = false;
      }
      if (this.payInLimit.val === "") {
        this.payInLimit.isValid = false;
        this.formIsValid = false;
      }
      if (this.payOutLimit.val === "") {
        this.payOutLimit.isValid = false;
        this.formIsValid = false;
      }
      if (this.is_utr_enabled.val === "") {
        this.is_utr_enabled.isValid = false;
        this.formIsValid = false;
      }
      if (this.paymentMethod.val === "") {
        this.paymentMethod.isValid = false;
        this.formIsValid = false;
      } else {
        if (this.paymentMethod.val === "UPI") {
          if (this.upiId.val === "") {
            this.upiId.isValid = false;
            this.formIsValid = false;
          }
        } else if (this.paymentMethod.val === "Manual Bank") {
          if (this.accountHolderName.val === "") {
            this.accountHolderName.isValid = false;
            this.formIsValid = false;
          }
          if (this.accountNumber.val === "") {
            this.accountNumber.isValid = false;
            this.formIsValid = false;
          }
          if (this.ifsc.val === "") {
            this.ifsc.isValid = false;
            this.formIsValid = false;
          }
          if (this.bankName.val === "") {
            this.bankName.isValid = false;
            this.formIsValid = false;
          }
        } else if (this.paymentMethod.val === "Automatic Payment") {
          if (this.upiId.val === "") {
            this.upiId.isValid = false;
            this.formIsValid = false;
          }
          if (this.merchantCode.val === "") {
            this.merchantCode.isValid = false;
            this.formIsValid = false;
          }
          if (this.merchantName.val === "") {
            this.merchantName.isValid = false;
            this.formIsValid = false;
          }
        } else if (this.paymentMethod.val === "automatic_payment_with_sms") {
          if (this.upiId.val === "") {
            this.upiId.isValid = false;
            this.formIsValid = false;
          }
          if (this.uniqueIdentifier.val === "") {
            this.uniqueIdentifier.isValid = false;
            this.formIsValid = false;
          }
        } else if (this.paymentMethod.val === "automatic_payment_with_extension" || this.paymentMethod.val === "chrome_extension_with_decimal") {
          if (this.accountNumber.val === "") {
            this.accountNumber.isValid = false;
            this.formIsValid = false;
          }
          if (this.extensionId.val === "") {
            this.extensionId.isValid = false;
            this.formIsValid = false;
          }
        } else if (this.paymentMethod.val === "static_qr") {

          if (this.mode == 'update') {
              if (this.qrPicture.val === null && this.qrPreview === null) {
                  this.qrPicture.isValid = false;
                  this.qrPicture.msg = "You must upload a QR.";
                  this.formIsValid = false;
              }
          }  else {
              if (this.qrPicture.val === null) {
                  this.qrPicture.isValid = false;
                  this.qrPicture.msg = "You must upload a QR.";
                  this.formIsValid = false;
              }
          }

        }
      }
    },
    changeIsPayNow(val) {
      this.isPayNow = val;
    },
    submitForm() {
      this.validateForm();

      if (!this.formIsValid) {
        return;
      }

      let formData = {
        username: this.username.val,
        name: this.name.val,
        email: this.email.val,
        phone: this.phone.val,
        upiid: this.upiId.val,
        payIn: this.payIn.val ? 1 : 0,
        payOut: this.payOut.val ? 1 : 0,
        payInLimit: this.payInLimit.val,
        payOutLimit: this.payOutLimit.val,
        balance: this.openingBalance.val,
        payInCommission: this.payInCommissionPercentage.val,
        payOutCommission: this.payOutCommissionPercentage.val,
        status: this.selectedUser.status,
        website: this.website.val,
        is_utr_enabled: parseInt(this.is_utr_enabled.val),
        isPayNow: this.isPayNow ? 1 : 0,
        paymentMethod: this.paymentMethod.val,
        merchantCode: this.merchantCode.val,
        merchantName: this.merchantName.val,
        uniqueIdentifier: this.uniqueIdentifier.val,
        accountNumber: this.accountNumber.val,
        accountHolderName: this.accountHolderName.val,
        ifsc: this.ifsc.val,
        bankName: this.bankName.val,
        extensionId: this.extensionId.val,
        qr_picture: this.qrPicture.val,
        qr: this.mode == 'create' ? '' : this.selectedUser.qr,
        qrPreview: this.qrPreview,
      };

      if (this.mode == "create") {
        formData.password = this.password.val;
      } else {
        if (this.password.val != "") {
          formData.password = this.password.val;
        }
      }

      this.$emit("create-user", formData);
    },
    isNumber: function(evt) {
      evt = evt ? evt : window.event;
      var charCode = evt.which ? evt.which : evt.keyCode;
      if (
        charCode > 31 &&
        (charCode < 48 || charCode > 57) &&
        charCode !== 46
      ) {
        evt.preventDefault();
      } else {
        return true;
      }
    },
    setUser() {
      this.name.val = this.selectedUser.name;
      this.username.val = this.selectedUser.username;
      this.email.val = this.selectedUser.email;
      this.phone.val = this.selectedUser.phone;
      this.upiId.val = this.selectedUser.upiId;
      this.openingBalance.val = this.selectedUser.balance;
      this.payInCommissionPercentage.val = this.selectedUser.payInCommission;
      this.payOutCommissionPercentage.val = this.selectedUser.payOutCommission;
      this.payIn.val = this.selectedUser.payIn ? true : false;
      this.payOut.val = this.selectedUser.payOut ? true : false;
      this.payInLimit.val = this.selectedUser.payInLimit;
      this.payOutLimit.val = this.selectedUser.payOutLimit;
      this.website.val = this.selectedUser.website
        ? this.selectedUser.website
        : "";
      this.is_utr_enabled.val = parseInt(this.selectedUser.is_utr_enabled);
      this.isPayNow = this.selectedUser.isPayNow;
      this.paymentMethod.val = this.selectedUser.paymentMethod;
      this.merchantCode.val = this.selectedUser.merchantCode ? this.selectedUser.merchantCode : "";
      this.merchantName.val = this.selectedUser.merchantName ? this.selectedUser.merchantName : "";
      this.uniqueIdentifier.val = this.selectedUser.uniqueIdentifier ? this.selectedUser.uniqueIdentifier : "";
      this.accountNumber.val = this.selectedUser.accountNumber ? this.selectedUser.accountNumber : "";
      this.accountHolderName.val = this.selectedUser.accountHolderName ? this.selectedUser.accountHolderName : "";
      this.ifsc.val = this.selectedUser.ifsc ? this.selectedUser.ifsc : "";
      this.bankName.val = this.selectedUser.bankName ? this.selectedUser.bankName : "";
      this.extensionId.val = this.selectedUser.extensionId ? this.selectedUser.extensionId : "";
      if (this.selectedUser.qr) {
          this.qrPreview = this.selectedUser.qr;
      }
    },
    async getWebsites() {
      try {
        const response = await http.get("/reports/websites");
        if (response.status === 200) {
          this.websites = response.data;
        }
      } catch (error) {
        console.log(error);
      }
    },
    cancelUploadedPhoto() {
      this.qrPicture.val = null;
      this.qrPreview = null;
    },
    onPickFile(ref) {
      this.$refs[ref].click();
    },
    handleUploadedPhoto(event) {
        this.qrPicture.isValid = true;
        this.qrPicture.msg = "";
        const file = event.target.files[0];
        if (file) {
            if (!file.type.includes('image/')) {
                this.qrPicture.isValid = false;
                this.qrPicture.msg = 'Only JPG, JPEG and PNG files are allowed.';
            } else if (file.size > 2 * 1024 * 1024) {
                this.qrPicture.isValid = false;
                this.qrPicture.msg = 'File size must be less than 2MB.';
            } else {
                this.qrPicture.isValid = true;
                this.qrPicture.msg = '';
                this.qrPicture.val = file;
                this.qrPreview = URL.createObjectURL(file);
            }
        }
    },
  },
};
</script>

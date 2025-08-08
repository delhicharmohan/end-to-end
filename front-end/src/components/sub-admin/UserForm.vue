<template>
  <form
    @submit.prevent="submitForm"
    class="flex flex-row flex-wrap px-4 mt-4 mb-4"
  >
    <div class="w-full flex flex-row flex-wrap mt-4">
      <div class="w-1/2 pr-4" :class="{ invalid: !name.isValid }">
        <label for="name">Name</label>
        <input
          type="text"
          id="name"
          v-model.trim="name.val"
          @blur="clearValidity('name')"
        />
        <p v-if="!name.isValid" class="text-xs">
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
        <p v-if="!username.isValid" class="text-xs">
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
        <p v-if="!email.isValid" class="text-xs">
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
        <p v-if="!phone.isValid" class="text-xs">
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
        <p v-if="!password.isValid" class="text-xs">
          Password must not be empty.
        </p>
      </div>
      <div v-if="mode == 'update'" class="mt-4 w-1/2 pl-4">
        <label for="status">Status</label>
        <select v-model.trim="status.val" id="status">
          <option value="1">Active</option>
          <option value="0">In Active</option>
        </select>
      </div>
      <div v-if="mode == 'update'" class="mt-4 w-1/2 pr-4">
        <label for="isLoggedIn">Login Status</label>
        <select v-model.trim="isLoggedIn.val" id="isLoggedIn">
          <option value="1">Logged In</option>
          <option value="0">Logged Out</option>
        </select>
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
export default {
  emits: ["create-user"],
  props: ["mode", "selectedUser"],
  mounted() {
    if (this.mode == "update") {
      this.setUser();
    }
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
      status: {
        val: true,
        isValid: true,
        msg: "",
      },
      isLoggedIn: {
        val: false,
        isValid: true,
        msg: "",
      },
      formIsValid: true,
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
        status: this.status.val,
        isLoggedIn: this.isLoggedIn.val,
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
      this.status.val = this.selectedUser.status;
      this.isLoggedIn.val = this.selectedUser.isLoggedIn;
    },
  },
};
</script>

<template>
  <div class="h-full w-full flex justify-center items-center">
    <base-dialog :show="!!error" title="An error occurred" @close="handleError">
      <p>{{ error }}</p>
    </base-dialog>
    <base-dialog :show="isLoading" title="Authenticating..." fixed>
      <base-spinner></base-spinner>
    </base-dialog>
    <base-card>
      <form @submit.prevent="submitForm" class="p-4 w-480">
        <div class="flex justify-center">
          <img class="h-20" src="../../assets/images/logo.jpg" />
        </div>
        <div class="">
          <label for="username">Username</label>
          <input type="text" id="username" v-model.trim="username" />
        </div>
        <div class="mt-4">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            autocomplete="off"
            v-model.trim="password"
          />
        </div>
        <p v-if="!formIsValid" class="text-xs text-red-600">
          Please enter a valid username and password.
        </p>
        <div class="flex justify-center mt-4">
          <base-button>{{ submitButtonCaption }}</base-button>
        </div>
      </form>
    </base-card>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: "",
      password: "",
      formIsValid: true,
      mode: "login",
      isLoading: false,
      error: null,
    };
  },
  computed: {
    submitButtonCaption() {
      if (this.mode === "login") {
        return "Login";
      } else {
        return "Signup";
      }
    },
    switchModeButtonCaption() {
      if (this.mode === "login") {
        return "Signup instead";
      } else {
        return "Login instead";
      }
    },
  },
  methods: {
    async submitForm() {
      this.formIsValid = true;
      if (this.username === "" || this.password === "") {
        this.formIsValid = false;
        return;
      }

      this.isLoading = true;

      const actionPayload = {
        username: this.username,
        password: this.password,
      };

      try {
        if (this.mode === "login") {
          await this.$store.dispatch("login", actionPayload);
        } else {
          await this.$store.dispatch("signup", actionPayload);
        }
        const redirectUrl = "/" + (this.$route.query.redirect || "dashboard");
        this.$router.replace(redirectUrl);
      } catch (err) {
        this.error =
          err.response.data.message ||
          err.message ||
          "Failed to authenticate, try later.";
      }

      this.isLoading = false;
    },
    switchAuthMode() {
      if (this.mode === "login") {
        this.mode = "signup";
      } else {
        this.mode = "login";
      }
    },
    handleError() {
      this.error = null;
    },
  },
};
</script>

<style scoped>
@responsive {
  .w-480 {
    width: 480px;
  }
}
/* .form-control {
  margin: 0.5rem 0;
} */

label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: block;
}

input,
textarea {
  display: block;
  width: 100%;
  font: inherit;
  border: 1px solid #ccc;
  padding: 0.15rem;
}

input:focus,
textarea:focus {
  border-color: #3d008d;
  background-color: #faf6ff;
  outline: none;
}
</style>

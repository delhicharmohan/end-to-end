<template>
  <header class="w-2/3 lg:w-4/5 fixed flex flex-col p-4">
    <base-card class="h-20 w-full flex justify-between items-center">
      <h1 class="flex-shrink-0">
        <p class="font-bold text-xl">{{ pageName }}</p>
      </h1>
      <ul class="flex-grow flex justify-end items-center">
        <li class="flex justify-start items-center mr-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-5 h-5 text-color-1"
          >
            <path
              fill-rule="evenodd"
              d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
              clip-rule="evenodd"
            />
          </svg>

          <span class="ml-1 text-sm text-color-1">{{ getUsername }}</span>
        </li>
        <li v-if="isLoggedIn" title="Logout">
          <svg
            @click="logout"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6 cursor-pointer text-red-500 hover:text-red-600"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
            />
          </svg>
        </li>
      </ul>
    </base-card>
  </header>
</template>

<script>
export default {
  data() {
    return {
      pageName: "Dashboard",
    };
  },
  mounted() {
    let $this = this;
    this.$router.beforeEach(function(to) {
      $this.pageName = to.name;
    });
  },
  computed: {
    isLoggedIn() {
      return this.$store.getters.isAuthenticated;
    },
    getUsername() {
      return this.$store.getters.username;
    },
  },
  methods: {
    async logout() {
      try {
        await this.$store.dispatch("logout");
        this.$router.replace("/");
      } catch (err) {
        this.error = err.message || "Failed to logout, try later.";
      }
    },
  },
};
</script>

<style scoped>
.text-color-1 {
  color: #67748e;
}
</style>

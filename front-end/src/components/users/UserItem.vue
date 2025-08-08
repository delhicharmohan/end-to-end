<template>
  <div
    class="border p-1 rounded-xl cursor-pointer flex flex-col bg-gradient-to-tl from-purple-700 to-pink-500"
  >
    <div class="bg-white p-3 rounded-xl h-full">
      <div class="flex justify-between items-center">
        <h1 class="leading-tight font-semibold">{{ user.username }}</h1>
        <div class="flex justify-start items-center flex-wrap">
          <div @click.stop="viewUserStatistics">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-blue-600">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div class="flex justify-between items-center mt-2">
        <h1 class="text-xs text-black-50 break-all">{{ user.upiId }}</h1>
        <div class="flex justify-start">
          <div title="Logged In" class="mr-2">
            <div
              v-if="user.isLoggedIn"
              class="h-3 w-3 rounded-full bg-green-600"
            ></div>
            <div v-else class="h-3 w-3 rounded-full bg-red-600"></div>
          </div>
          <div title="Active">
            <div
              v-if="user.status"
              class="h-3 w-3 rounded-full bg-green-600"
            ></div>
            <div v-else class="h-3 w-3 rounded-full bg-red-600"></div>
          </div>
        </div>
      </div>

      <div class="flex flex-col mt-4 text-xs">
        <div class="flex justify-between items-center">
          <div>Approved Count</div>
          <div>{{ user.approvedCount }}</div>
        </div>
        <div class="flex justify-between items-center">
          <div>Approved Amount</div>
          <div>{{ parseInt(user.approvedAmount) }}</div>
        </div>
        <div class="flex justify-between items-center">
          <div>Pending Count</div>
          <div>{{ user.pendingCount }}</div>
        </div>
        <div class="flex justify-between items-center">
          <div>Pending Amount</div>
          <div>{{ parseInt(user.pendingAmount) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "user-item",
  emits: ["view-user-statistics"],
  props: ["user"],
  methods: {
    viewUserStatistics() {
      this.$emit('view-user-statistics', this.user.username);
    }
  },
};
</script>

<style lang="scss" scoped>
.text-black-50 {
  color: #00000080;
}
</style>

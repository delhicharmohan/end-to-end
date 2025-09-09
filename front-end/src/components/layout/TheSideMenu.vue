<template>
  <aside class="w-1/3 lg:w-1/5 h-full flex flex-col fixed p-4">
    <base-card class="h-full flex flex-col">
      <div class="h-auto">
        <div class="flex justify-center items-center my-4 m-0 text-sm whitespace-nowrap">
          <img src="../../assets/images/logo.jpg" class="inline h-full max-w-full max-h-16 lg:max-h-20"
            alt="Wiz-Pay Logo" />
          <!-- <span class="ml-3 font-semibold text-2xl uppercase">Wizpay</span> -->
        </div>
      </div>
      <!-- <hr class="mx-6" /> -->
      <div class="items-center block w-auto max-h-screen overflow-auto h-sidenav grow basis-full">
        <ul v-if="isSuperAdmin">
          <li class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/dashboard">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-dashboard></icon-dashboard>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Dashboard</span>
            </router-link>
          </li>
          <li class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/vendor">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-users></icon-users>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Vendors</span>
            </router-link>
          </li>
          <li class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/clients">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-users></icon-users>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Clients</span>
            </router-link>
          </li>
        </ul>
        <ul v-else class="flex flex-col xl:px-8 mb-0">
          <li class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/dashboard">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-dashboard></icon-dashboard>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Dashboard</span>
            </router-link>
          </li>
          <li v-if="isShowPayInStatistics" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/payin">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-pay-in></icon-pay-in>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Pay In</span>
            </router-link>
          </li>
          <!-- <li v-if="isShowPayOutStatistics" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/payout">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-pay-out></icon-pay-out>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Pay Out</span>
            </router-link>
          </li> -->

          <li v-if="isShowPayOutStatistics" class="mt-4 w-full">
            <div @click="toggleSubmenu" class="cursor-pointer py-3 my-0 flex items-center whitespace-nowrap px-4">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <IconPayOut />
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">
                Pay Out
              </span>
            </div>

            <!-- Submenu with Icons -->
            <ul v-show="isSubmenuOpen" class="pl-8 mt-2 space-y-2">
              <li>
                <router-link class="py-2 flex items-center px-4 rounded hover:bg-gray-100" to="/instant-payout">
                  <div class="mr-2 flex h-6 w-6 items-center justify-center rounded bg-gray-200">
                    <icon-pay-out></icon-pay-out>
                  </div>
                  Instant Payout
                </router-link>
              </li>
              <li>
                <router-link class="py-2 flex items-center px-4 rounded hover:bg-gray-100" to="/instant-payout-market">
                  <div class="mr-2 flex h-6 w-6 items-center justify-center rounded bg-gray-200">
                    <icon-pay-out></icon-pay-out>
                  </div>
                  Instant Payout Market
                </router-link>
              </li>
              <li>
                <router-link class="py-2 flex items-center px-4 rounded hover:bg-gray-100" to="/payout">
                  <div class="mr-2 flex h-6 w-6 items-center justify-center rounded bg-gray-200">
                    <icon-pay-out></icon-pay-out>
                  </div>
                  Standard Payout
                </router-link>
              </li>
            </ul>
          </li>

          <li v-if="isAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/users">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-users></icon-users>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Users</span>
            </router-link>
          </li>
          <li v-if="isAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/sub-admin">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-users></icon-users>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Sub Admins</span>
            </router-link>
          </li>
          <li v-if="isAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/order-creator">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-users></icon-users>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Order Creators</span>
            </router-link>
          </li>
          <li v-if="isAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/support-user">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-users></icon-users>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Support Users</span>
            </router-link>
          </li>
          <li v-if="isAdmin || isSubAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/reports">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-document class="h-4 w-4"></icon-document>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Reports</span>
            </router-link>
          </li>
          <li v-if="isSubAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/reset-password">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-lock-closed class="h-4 w-4"></icon-lock-closed>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Reset Password</span>
            </router-link>
          </li>
          <li v-if="isAdmin" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/callback">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-uturn-left class="h-4 w-4"></icon-uturn-left>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Callback</span>
            </router-link>
          </li>
          <!-- <li v-if="isAdmin" class="mt-4 w-full">
            <router-link
              class="py-3 my-0 flex items-center whitespace-nowrap px-4"
              to="/upload-statement"
            >
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200"
              >
                <icon-arrow-up-tray class="h-4 w-4"></icon-arrow-up-tray>
              </div>
              <span
                class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft"
                >Upload Statement</span
              >
            </router-link>
          </li> -->
          <li v-if="isOrderCreator" class="mt-4 w-full">
            <router-link class="py-3 my-0 flex items-center whitespace-nowrap px-4" to="/manual-order">
              <div
                class="flex-shrink-0 shadow-2xl mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center stroke-0 text-center bg-gray-200">
                <icon-pay-out></icon-pay-out>
              </div>
              <span class="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">Manual Order</span>
            </router-link>
          </li>
        </ul>
      </div>
    </base-card>
  </aside>
</template>

<script>
import IconDashboard from "../icons/IconDashboard.vue";
import IconPayIn from "../icons/IconPayIn.vue";
import IconPayOut from "../icons/IconPayOut.vue";
import IconUsers from "../icons/IconUsers.vue";
import IconDocument from "../icons/IconDocument.vue";
import IconUturnLeft from "../icons/IconUturnLeft.vue";
// import IconArrowUpTray from "../icons/IconArrowUpTray.vue";
import IconLockClosed from "../icons/IconLockClosed.vue";
export default {
  data() {
    return {
      isSubmenuOpen: false,
    };
  },
  name: "side-menu",
  components: {
    IconDashboard,
    IconPayIn,
    IconPayOut,
    IconUsers,
    IconDocument,
    IconUturnLeft,
    // IconArrowUpTray,
    IconLockClosed,
  },
  computed: {
    isOrderCreator() {
      if (this.$store.getters.isOrderCreator) {
        return true;
      } else {
        return false;
      }
    },
    isAdmin() {
      if (this.$store.getters.isAdmin) {
        return true;
      } else {
        return false;
      }
    },
    isSubAdmin() {
      if (this.$store.getters.isSubAdmin) {
        return true;
      } else {
        return false;
      }
    },
    isSuperAdmin() {
      return this.$store.getters.isSuperAdmin;
    },
    isShowPayInStatistics() {
      if (this.$store.getters.isUser) {
        if (this.$store.getters.payInStatus == "0") {
          return false;
        } else {
          return true;
        }
      } else if (this.$store.getters.isOrderCreator) {
        return false;
      } else if (this.$store.getters.isSupport) {
        return false;
      } else {
        return true;
      }
    },
    isShowPayOutStatistics() {
      if (this.$store.getters.isUser) {
        if (this.$store.getters.payOutStatus == "0") {
          return false;
        } else {
          return true;
        }
      } else if (this.$store.getters.isOrderCreator) {
        return false;
      } else if (this.$store.getters.isSupport) {
        return false;
      } else {
        return true;
      }
    },
  },

  methods: {
    toggleSubmenu() {
      this.isSubmenuOpen = !this.isSubmenuOpen;
    },
  }
};
</script>

<style lang="scss" scoped>
a:active,
a:hover,
a.router-link-active {
  @apply font-semibold;

  & div {
    @apply bg-gradient-to-tl from-purple-700 to-pink-500;

    svg {
      color: white;
    }
  }
}
</style>

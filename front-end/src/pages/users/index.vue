<template>
  <div class="h-full flex flex-col p-4">
    <base-dialog
      :show="!!error"
      title="An error occurred!"
      @close="handleError"
    >
      <p>{{ error }}</p>
    </base-dialog>
    <base-toast
      v-if="!!baseToast.message"
      :message="baseToast.message"
      :type="baseToast.type"
      @close="handleBaseToast"
    ></base-toast>
    <Transition v-if="isPermission" name="fade" mode="out-in">
      <section key="1" v-if="isCreateUser" class="h-full">
        <base-card class="h-full flex flex-col">
          <div class="flex w-full ht-42 px-4 mt-2">
            <div
              v-if="isLoading"
              class="h-full w-full flex justify-start items-center"
            >
              <icon-spinner class="text-blue-600"></icon-spinner>
              <h1 class="ml-2 font-semibold text-xl">{{ getLoadingText }}</h1>
            </div>
            <div v-else class="h-full w-full flex justify-start items-center">
              <icon-back
                @click.stop="isCreateUser = false"
                class="text-blue-600"
              ></icon-back>
              <h1 class="ml-2 font-semibold text-xl">{{ getFormText }}</h1>
              <div
                v-if="mode == 'update'"
                class="flex-grow flex justify-end items-center"
              >
                <div class="flex justify-start items-center mr-8">
                  <div class="wd-200">
                    Login Status:
                    <span
                      :class="
                        selectedUser.isLoggedIn
                          ? 'text-green-600'
                          : 'text-red-600'
                      "
                      >{{ getUserLoginStatus }}</span
                    >
                  </div>
                  <base-toggle
                    class="mb-0"
                    :is-checked="selectedUser.isLoggedIn"
                    @rsd-checkbox-changed="changeUserLoginStatus"
                  ></base-toggle>
                </div>
                <div class="flex justify-start items-center mr-8">
                  <div class="w-32">
                    Status:
                    <span
                      :class="
                        selectedUser.status ? 'text-green-600' : 'text-red-600'
                      "
                      >{{ getUserStatus }}</span
                    >
                  </div>
                  <base-toggle
                    class="mb-0"
                    :is-checked="selectedUser.status"
                    @rsd-checkbox-changed="changeUserStatus"
                  ></base-toggle>
                </div>
                <icon-delete
                  v-if="selectedUser.role != 'admin'"
                  @click.stop="deleteUser"
                  class="h-6 w-6 cursor-pointer hover:text-red-600"
                ></icon-delete>
              </div>
            </div>
          </div>
          <base-spinner class="flex-auto" v-if="isLoading"></base-spinner>
          <div v-else class="flex-auto flex flex-col overflow-y-auto">
            <user-form
              :mode="mode"
              :selected-user="selectedUser"
              @create-user="createUser"
            ></user-form>
          </div>
        </base-card>
      </section>
      <section key="2" v-else class="h-full">
        <base-card
          class="h-full flex flex-col"
          :class="isLoading ? 'flex' : ''"
        >
          <div class="flex justify-end items-center px-4 pt-4">
            <base-button mode="outline" @click.stop="createBtnClicked"
              >Create</base-button
            >
          </div>
          <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
          <div
            v-else-if="hasUsers && !isLoading"
            class="flex-auto flex flex-col mt-4 overflow-y-auto px-4 mb-4"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <user-item
                v-for="(user, index) in filteredUsers"
                :key="index"
                :user="user"
                @click.stop="updateUser(user)"
                @view-user-statistics="viewUserStatistics"
              ></user-item>
            </div>
            <div class="mt-4 flex-auto flex flex-col justify-end">
              <pagination
                :paginatorInfo="paginatorInfo"
                :setPage="setPage"
              ></pagination>
            </div>
          </div>
          <h3 v-else class="text-center font-medium">No users found!</h3>
          <transition name="fade" mode="out-in">
              <base-modal v-if="openUserStatistics" :title="`${selectedUsername} Report`" height="" @close="closeUserStatistics">
                  <user-report :username="selectedUsername" class="px-8 pt-6"></user-report>
              </base-modal>
          </transition>
        </base-card>
      </section>
    </Transition>
    <base-card v-else class="h-full flex flex-col justify-center items-center">
      <div class="flex flex-col justify-center items-center">
        <h1 class="justify-center font-bold text-2xl text-red-600">
          You don't have permission to access this page!
        </h1>
        <p class="justify-center font-bold text-2xl">
          Go to home page
          <router-link to="/"
            ><span class="underline cursor-pointer text-blue-700"
              >Wiz-Pay</span
            ></router-link
          >
        </p>
      </div>
    </base-card>
  </div>
</template>

<script>
import UserItem from "../../components/users/UserItem.vue";
import IconBack from "../../components/icons/IconBack.vue";
import UserForm from "../../components/users/UserForm.vue";
import UserReport from "../../components/users/UserReport.vue";
import IconSpinner from "../../components/icons/IconSpinner.vue";
import IconDelete from "../../components/icons/IconDelete.vue";
import http from "../../http-common";
import Pagination from "../../components/shared/pagination.vue";
export default {
  name: "users",
  components: {
    UserItem,
    IconBack,
    IconSpinner,
    UserForm,
    IconDelete,
    Pagination,
    UserReport,
  },
  data() {
    return {
      isPermission: true,
      isLoading: false,
      error: null,
      isCreateUser: false,
      baseToast: {
        type: "",
        message: "",
      },
      mode: "create",
      selectedUser: Object,
      first: 10,
      page: 1,
      openUserStatistics: false,
      selectedUsername: "",
    };
  },
  watch: {
     page() {
        this.getUsers();
      },
  },
  computed: {
    filteredUsers() {
      return this.$store.getters["users/users"];
    },
    paginatorInfo() {
      return this.$store.getters["users/pagination"];
    },
    hasUsers() {
      return this.$store.getters["users/hasUsers"];
    },
    getFormText() {
      if (this.mode == "create") {
        return "Create User";
      } else {
        return `Update User - ${this.selectedUser.username}`;
      }
    },
    getUserStatus() {
      if (this.selectedUser.status) {
        return "Active";
      } else {
        return "Inactive";
      }
    },
    getUserLoginStatus() {
      if (this.selectedUser.isLoggedIn) {
        return "Logged In";
      } else {
        return "Logged Out";
      }
    },
    getLoadingText() {
      if (this.mode == 'create') {
        return "Creating...";
      } else {
        return "Updating...";
      }
    }
  },
  created() {
    this.getUsers();
  },
  methods: {
    setPage(page) {
      this.page = page;
    },
    async getUsers() {
      this.isLoading = true;
      try {
        const params = {
          first: this.first,
          page: this.page,
        }
        await this.$store.dispatch("users/getUsers", params);
      } catch (error) {
        if (!error.status) {
          this.isPermission = false;
        }
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },
    handleError() {
      this.error = null;
    },
    handleBaseToast() {
      this.baseToast = {
        type: "",
        message: "",
      };
    },
    createBtnClicked() {
      this.mode = "create";
      this.isCreateUser = true;
      this.selectedUser = Object;
    },
    async createUser(data) {
      this.isLoading = true;
      try {
        if (this.mode == "create") {
          await this.$store.dispatch("users/createUser", data);
          this.baseToast.message = "User created successfully!";
        } else {
          await this.$store.dispatch("users/updateUser", data);
          this.baseToast.message = "User updated successfully!";
        }
        this.isCreateUser = false;
        this.baseToast.type = "success";
        let $this = this;
        setTimeout(() => {
          $this.handleBaseToast();
        }, 1000);
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },
    updateUser(user) {
      this.mode = "update";
      this.isCreateUser = true;
      this.selectedUser = user;
    },
    async deleteUser() {
      this.$swal
        .fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, delete it!",
        })
        .then(async (result) => {
          if (result.isConfirmed) {
            await this.$store.dispatch("users/deleteUser", this.selectedUser);
            this.$swal.fire("Deleted!", "User has been deleted.", "success");
            this.selectedUser = Object;
            this.isCreateUser = false;
          }
        });
    },
    async changeUserLoginStatus(status) {
      const username = this.selectedUser.username;

      const response = await http.put(`/users/${username}/${status}`);

      if (response.status === 200) {
        this.selectedUser.isLoggedIn = status;
      }
    },
    async changeUserStatus(status) {
      this.isChecked = status;

      const data = {
        username: this.selectedUser.username,
        status: status,
      };

      try {
        await this.$store.dispatch("users/changeUserStatus", data);

        const Toast = this.$swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener("mouseenter", this.$swal.stopTimer);
            toast.addEventListener("mouseleave", this.$swal.resumeTimer);
          },
        });

        Toast.fire({
          icon: "success",
          title: this.isChecked
            ? "User activated successfully"
            : "User inactivated successfully",
        });

        this.selectedUser.status = status;
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
    },
    viewUserStatistics(username) {
      this.selectedUsername = username;
      this.openUserStatistics = true;
    },
    closeUserStatistics() {
      this.openUserStatistics = false;
      this.selectedUsername = "";
    },
  },
};
</script>

<style lang="scss" scoped>
@responsive {
  .ht-42 {
    height: 42px;
  }
  .wd-200 {
    width: 200px;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

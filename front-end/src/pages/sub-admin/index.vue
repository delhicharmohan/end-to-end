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
              <h1 class="ml-2 font-semibold text-xl">Creating...</h1>
            </div>
            <div v-else class="h-full w-full flex justify-start items-center">
              <icon-back
                @click.stop="isCreateUser = false"
                class="text-blue-600"
              ></icon-back>
              <h1 class="ml-2 font-semibold text-xl">{{ getFormText }}</h1>
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
            class="flex flex-col overflow-x-auto"
          >
            <div class="sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full sm:px-6 lg:px-8">
                <div class="overflow-x-auto">
                  <table class="min-w-full text-left text-sm font-light">
                    <thead class="border-b font-medium dark:border-neutral-500">
                      <tr>
                        <th scope="col" class="px-6 py-4">#</th>
                        <th scope="col" class="px-6 py-4">Name</th>
                        <th scope="col" class="px-6 py-4">Username</th>
                        <th scope="col" class="px-6 py-4">Email</th>
                        <th scope="col" class="px-6 py-4">Phone Number</th>
                        <th scope="col" class="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(subadmin, index) in filteredUsers"
                        :key="index"
                        class="border-b dark:border-neutral-500"
                      >
                        <td class="whitespace-nowrap px-6 py-4 font-medium">
                          {{ index + 1 }}
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          {{ subadmin.name }}
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          {{ subadmin.username }}
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          {{ subadmin.email }}
                        </td>
                        <td class="whitespace-nowrap px-6 py-4">
                          {{ subadmin.phone }}
                        </td>
                        <td>
                          <div class="flex justify-center items-center">
                            <icon-edit
                              @click.stop="updateUser(subadmin)"
                              class="h-5 w-5 cursor-pointer hover:text-blue-600 mr-2"
                            ></icon-edit>
                            <icon-delete
                              @click.stop="deleteUser(subadmin)"
                              class="h-5 w-5 cursor-pointer hover:text-red-600"
                            ></icon-delete>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <h3 v-else class="text-center font-medium">No sub admins found!</h3>
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
import IconEdit from "../../components/icons/IconEdit.vue";
import IconDelete from "../../components/icons/IconDelete.vue";
import IconBack from "../../components/icons/IconBack.vue";
import UserForm from "../../components/sub-admin/UserForm.vue";
import IconSpinner from "../../components/icons/IconSpinner.vue";
export default {
  name: "users",
  components: {
    IconEdit,
    IconDelete,
    IconBack,
    IconSpinner,
    UserForm,
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
    };
  },
  computed: {
    filteredUsers() {
      return this.$store.getters["subadmin/users"];
    },
    hasUsers() {
      return this.$store.getters["subadmin/hasUsers"];
    },
    getFormText() {
      if (this.mode == "create") {
        return "Create Sub Admin";
      } else {
        return `Update Sub Admin - ${this.selectedUser.username}`;
      }
    },
  },
  created() {
    this.getUsers();
  },
  methods: {
    async getUsers() {
      this.isLoading = true;
      try {
        await this.$store.dispatch("subadmin/getUsers");
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
          await this.$store.dispatch("subadmin/createUser", data);
          this.baseToast.message = "Sub admin created successfully!";
        } else {
          await this.$store.dispatch("subadmin/updateUser", data);
          this.baseToast.message = "Sub admin updated successfully!";
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
    async deleteUser(user) {
      this.selectedUser = user;
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
            await this.$store.dispatch(
              "subadmin/deleteUser",
              this.selectedUser
            );
            this.$swal.fire(
              "Deleted!",
              "Sub admin has been deleted.",
              "success"
            );
            this.selectedUser = Object;
            this.isCreateUser = false;
          }
        });
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

<template>
  <div class="h-full flex flex-col p-4">
    <base-dialog :show="!!error" title="An error occurred!" @close="handleError">
      <p>{{ error }}</p>
    </base-dialog>
    <base-toast v-if="!!baseToast.message" :message="baseToast.message" :type="baseToast.type"
      @close="handleBaseToast"></base-toast>
    <Transition name="fade" mode="out-in">
      <section key="1" v-if="isCreateClient" class="h-full">
        <base-card class="h-full flex flex-col">
          <div class="flex w-full ht-42 px-4 mt-2">
            <div v-if="isLoading" class="h-full w-full flex justify-start items-center">
              <icon-spinner class="text-blue-600"></icon-spinner>
              <h1 class="ml-2 font-semibold text-xl">
                {{ getFormTextLoading }}
              </h1>
            </div>
            <div v-else class="h-full w-full flex justify-start items-center">
              <icon-back @click.stop="backButtonClicked" class="text-blue-600"></icon-back>
              <h1 class="ml-2 font-semibold text-xl">{{ getFormText }}</h1>
              <!-- <div
                v-if="mode == 'update'"
                class="flex-grow flex justify-end items-center"
              >
                <icon-delete
                  @click.stop="deleteClient"
                  class="h-6 w-6 cursor-pointer hover:text-red-600"
                ></icon-delete>
              </div> -->
            </div>
          </div>
          <base-spinner class="flex-auto" v-if="isLoading"></base-spinner>
          <div v-else class="flex-auto flex flex-col overflow-y-auto">
            <client-form :mode="mode" :selected-client="selectedClient" @create-client="createClient"></client-form>
          </div>
        </base-card>
      </section>
      <section key="2" v-else class="h-full">
        <base-card class="h-full flex flex-col" :class="isLoading ? 'flex' : ''">
          <div class="flex justify-end items-center px-4 pt-4">
            <base-button mode="outline" @click.stop="createBtnClicked">Create</base-button>
          </div>
          <clients-list @edit-client="editClient"></clients-list>
        </base-card>
      </section>
    </Transition>
  </div>
</template>

<script>
import ClientsList from "./clients_list.vue";
import ClientForm from "../../components/clients/ClientForm.vue";
import IconSpinner from "../../components/icons/IconSpinner.vue";
import IconBack from "../../components/icons/IconBack.vue";
export default {
  name: "clients",
  components: {
    ClientsList,
    ClientForm,
    IconSpinner,
    IconBack,
  },
  data() {
    return {
      isLoading: false,
      error: null,
      isCreateClient: false,
      baseToast: {
        type: "",
        message: "",
      },
      mode: "create",
      selectedClient: Object,
    };
  },
  computed: {
    getFormText() {
      if (this.mode == "create") {
        return "Create Client";
      } else {
        return `Update Client - ${this.selectedClient.clientName}`;
      }
    },
    getFormTextLoading() {
      if (this.mode == "create") {
        return "Creating...";
      } else {
        return "Updating...";
      }
    },
  },
  methods: {
    backButtonClicked() {
      this.mode = "create";
      this.isCreateClient = false;
      this.selectedClient = Object;
    },
    createBtnClicked() {
      this.mode = "create";
      this.isCreateClient = true;
      this.selectedClient = Object;
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
    async createClient(data) {
      this.isLoading = true;
      try {
        if (this.mode == "create") {
          await this.$store.dispatch("clients/createClient", data);
          this.baseToast.message = "Client created successfully!";
        } else {
          await this.$store.dispatch("clients/updateClient", data);
          this.baseToast.message = "Client updated successfully!";
        }
        this.isCreateClient = false;
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
    editClient(client) {
      this.mode = "update";
      this.isCreateClient = true;
      this.selectedClient = client;
    },
  },
};
</script>

<style lang="scss" scoped>
@responsive {
  .ht-42 {
    height: 42px;
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

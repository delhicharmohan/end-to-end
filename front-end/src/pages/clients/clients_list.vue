<template>
  <div class="h-full w-full flex flex-col">
    <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
    <div v-else-if="hasClients && !isLoading" class="flex flex-col overflow-x-auto">
      <div class="sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full sm:px-6 lg:px-8">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm font-light">
              <thead class="border-b font-medium dark:border-neutral-500">
                <tr>
                  <th scope="col" class="px-6 py-4">#</th>
                  <th scope="col" class="px-6 py-4">Vendor Name</th>
                  <th scope="col" class="px-6 py-4">Client Name</th>
                  <th scope="col" class="px-6 py-4">Secret Key</th>
                  <th scope="col" class="px-6 py-4">x-Key</th>
                  <th scope="col" class="px-6 py-4">Pay In Callback URL</th>
                  <th scope="col" class="px-6 py-4">Pay Out Callback URL</th>
                  <th scope="col" class="px-6 py-4">Failed Order Callback URL</th>
                  <th scope="col" class="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(client, index) in filteredClients" :key="index" class="border-b dark:border-neutral-500">
                  <td class="whitespace-nowrap px-6 py-4 font-medium">
                    {{ index + 1 }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ client.vendor }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ client.clientName }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ client.secret }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">{{ client.xKey }}</td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ client.callbackURL }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ client.payOutCallbackURL }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    {{ client.failedOrderCallbackURL }}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    <div @click.stop="editClient(client)" class="text-blue-600 cursor-pointer underline">
                      Edit
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <h3 v-else class="text-center font-medium">No clients found!</h3>
  </div>
</template>

<script>
export default {
  name: "clients-list",
  emits: ["edit-client"],
  data() {
    return {
      isLoading: false,
    };
  },
  created() {
    this.getClients();
  },
  computed: {
    hasClients() {
      return this.$store.getters["clients/hasClients"];
    },
    filteredClients() {
      return this.$store.getters["clients/clients"];
    },
  },
  methods: {
    async getClients() {
      this.isLoading = true;
      try {
        await this.$store.dispatch("clients/getClients");
      } catch (error) {
        this.error = error.message || "Something failed!";
      }
      this.isLoading = false;
    },
    editClient(client) {
      console.log(client);
      console.log(client);
      console.log(client);
      this.$emit("edit-client", client);
    },
  },
};
</script>

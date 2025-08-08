<template>
    <div class="h-full flex flex-col p-4">
        <div class="h-full">
            <base-card class="h-full flex flex-col" :class="isLoading ? 'flex' : ''">
                <base-spinner v-if="isLoading" class="flex-auto"></base-spinner>
                <div v-else-if="hasUsers && !isLoading" class="flex flex-col overflow-x-auto h-full">
                    <div class="sm:-mx-6 lg:-mx-8">
                        <div class="inline-block min-w-full sm:px-6 lg:px-8">
                            <div class="overflow-x-auto">
                                <table class="min-w-full text-left text-sm font-light">
                                    <thead class="border-b font-medium dark:border-neutral-500">
                                        <tr>
                                            <th scope="col" class="px-6 py-4">#</th>
                                            <th scope="col" class="px-6 py-4">Name</th>
                                            <th scope="col" class="px-6 py-4">Username</th>
                                            <th scope="col" class="px-6 py-4">Role</th>
                                            <th scope="col" class="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(user, index) in users" :key="index" class="border-b dark:border-neutral-500">
                                            <td class="whitespace-nowrap px-6 py-4 font-medium">{{ pagination.firstItem + index }}</td>
                                            <td class="whitespace-nowrap px-6 py-4">{{ user.name }}</td>
                                            <td class="whitespace-nowrap px-6 py-4 font-semibold">{{ user.username }}</td>
                                            <td class="whitespace-nowrap px-6 py-4">{{ user.role }}</td>
                                            <td>
                                                <div class="flex justify-center items-center">
                                                    <icon-edit @click.stop="openModal(user.username)" class="h-4 w-4 cursor-pointer hover:text-blue-600 mr-2"></icon-edit>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 flex-auto flex flex-col justify-end">
                        <pagination
                            :paginatorInfo="pagination"
                            :setPage="setPage"
                        ></pagination>
                    </div>
                    <!-- form start -->
                    <transition name="fade" mode="out-in">
                        <base-modal v-if="showModal" :title="`Reset Password - ${selectedUsername}`" @close="closeModal">
                            <form class="flex flex-col" @submit.prevent="submitForm">
                                <div class="grid grid-cols-1 gap-6 p-8">
                                    <div class="flex flex-col" :class="{ invalid: !password.isValid }">
                                        <label for="password">New Password*</label>
                                        <input
                                            type="password"
                                            autocomplete="off"
                                            id="password"
                                            v-model.trim="password.val"
                                            placeholder="New Password"
                                            @blur="clearValidity('password')"
                                        />
                                        <transition name="fade" mode="out-in">
                                            <p v-if="!password.isValid" class="h-4 text-xs text-red-600">
                                                {{ password.msg }}
                                            </p>
                                        </transition>
                                    </div>
                                    <div class="flex flex-col" :class="{ invalid: !confirmPassword.isValid }">
                                        <label for="confirmPassword">Confirm New Password*</label>
                                        <input
                                            type="password"
                                            autocomplete="off"
                                            id="confirmPassword"
                                            v-model.trim="confirmPassword.val"
                                            placeholder="Confirm New Password"
                                            @blur="clearValidity('confirmPassword')"
                                        />
                                        <transition name="fade" mode="out-in">
                                            <p v-if="!confirmPassword.isValid" class="h-4 text-xs text-red-600">
                                                {{ confirmPassword.msg }}
                                            </p>
                                        </transition>
                                    </div>
                                </div>
                                <div class="flex justify-center">
                                    <button type="submit" class="border-2 font-medium border-green-600 text-white hover:text-green-600 bg-green-600 hover:bg-white rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">Submit</button>
                                </div>
                            </form>
                        </base-modal>
                    </transition>
                    <!-- form end -->
                </div>
                <h3 v-else class="text-center font-medium">No users found!</h3>
            </base-card>
        </div>
    </div>
</template>

<script>
import http from "../../http-common.js";
import IconEdit from "../../components/icons/IconEdit.vue";
import Pagination from "../../components/shared/pagination.vue";
export default {
    name: "reset-password",
    components: {
        IconEdit,
        Pagination,
    },
    data() {
        return {
            isLoading: false,
            first: 10,
            page: 1,
            users: [],
            pagination: {},
            showModal: false,
            selectedUsername: null,
            password: {
                val: "",
                isValid: true,
                msg: "",
            },
            confirmPassword: {
                val: "",
                isValid: true,
                msg: "",
            },
            formIsValid: true,
        };
    },
    created() {
        this.getUsers();
    },
    computed: {
        vendor() {
            return this.$store.getters.vendor;
        },
        hasUsers() {
            return this.users && this.users.length > 0;
        },
    },
    methods: {
        setPage(page) {
            this.page = page;
            this.getUsers();
        },
        clearValidity(input) {
            this[input].isValid = true;
            this[input].msg = "";
        },
        async getUsers() {
            this.isLoading = true;
            try {
                let url = `/users/${this.vendor}/getResetPasswordUsers?first=${this.first}&page=${this.page}`;
                const response = await http.get(url);
                if (response.status === 200) {
                    if (response.data.success) {
                        this.users = response.data.data;
                        this.pagination = response.data.pagination;
                    } else {
                        this.showError(response.data.message);
                    }
                }
            } catch (error) {
                this.showError(error);
            }
            this.isLoading = false;
        },
        openModal(username) {
            this.selectedUsername = username;
            this.showModal = true;
        },
        closeModal() {
            this.showModal = false;
            this.resetData();
            this.selectedUsername = null;
        },
        resetData() {
            this.password = {
                val: "",
                isValid: true,
                msg: "",
            };
            this.confirmPassword = {
                val: "",
                isValid: true,
                msg: "",
            };
        },
        validateForm() {
            this.formIsValid = true;
            if (this.password.val === "") {
                this.password.isValid = false;
                this.password.msg = "New Password must not be empty.";
                this.formIsValid = false;
            }
            if (this.confirmPassword.val === "") {
                this.confirmPassword.isValid = false;
                this.confirmPassword.msg = "Confirm New Password must not be empty.";
                this.formIsValid = false;
            }
            if (this.password.val != '' && this.confirmPassword.val != '') {
                if (this.password.val != this.confirmPassword.val) {
                    this.confirmPassword.isValid = false;
                    this.confirmPassword.msg = "Password Mismatch.";
                    this.formIsValid = false;
                }
            }
        },
        async submitForm() {
            this.validateForm();

            if (!this.formIsValid) {
                return;
            }

            const formData = {
                password: this.password.val,
            };

            try {
                let url = `/users/${this.selectedUsername}/updatePassword`;
                const response = await http.post(url, formData);
                if (response.status === 201) {
                    if (response.data.success) {
                        this.$swal.fire(
                            "Updated!",
                            `${response.data.message}`,
                            "success"
                        );
                        this.closeModal();
                    } else {
                        this.showError(response.data.message);
                    }
                }
            } catch (error) {
                this.showError(error);
            }
        },
        showError(message) {
            this.$swal.fire({
                icon: 'error',
                title: message,
                text: "",
            }).then((result) => {
                if (result.value || result.dismiss) {
                    this.closeModal();
                }
            })
        }
    },
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  height: 0px;
}
.form-fade-enter-active,
.form-fade-leave-active {
  transition: all 0.5s ease;
}

.form-fade-enter-from,
.form-fade-leave-to {
  opacity: 0;
  height: 0px;
}
</style>
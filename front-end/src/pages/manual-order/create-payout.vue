<template>
    <div class="h-full w-full flex flex-col bg-gray-50 px-4 sm:px-0">
        <base-dialog
            :show="!!error"
            title="An error occurred!"
            @close="closeTheDialogBox"
            >
            <p>{{ error }}</p>
        </base-dialog>
        <div v-if="showForm" class="h-full w-full flex flex-col justify-center items-center">
            <div class="w-full sm:w-2/3 md:w-3/5 lg:w-1/2 xl:w-2/5 2xl:w-1/3 p-8 bg-white rounded-lg shadow-lg border flex flex-col">
                <h2 class="text-2xl sm:text-4xl font-bold text-center">Transfer Your Fund</h2>
                <div class="flex flex-col mt-4" :class="{ invalid: !amount.isValid }">
                    <label for="amount">Enter Amount*</label>
                    <input type="text" placeholder="Amount" v-model.trim="amount.val" @blur="clearValidity('amount')" id="amount" @keypress="allowNumbersOnly">
                    <transition name="form-fade" mode="out-in">
                        <p v-if="!amount.isValid" class="h-4 text-xs text-red-600 ml-1">
                            {{ amount.msg }}
                        </p>
                    </transition>
                </div>
                <div class="flex flex-col mt-4" :class="{ invalid: !accountNumber.isValid }">
                    <label for="accountNumber">Account Number*</label>
                    <input type="text" placeholder="Account Number" v-model.trim="accountNumber.val" @blur="clearValidity('accountNumber')" id="accountNumber">
                    <transition name="form-fade" mode="out-in">
                        <p v-if="!accountNumber.isValid" class="h-4 text-xs text-red-600 ml-1">
                            {{ accountNumber.msg }}
                        </p>
                    </transition>
                </div>
                <div class="flex flex-col mt-4" :class="{ invalid: !ifsc.isValid }">
                    <label for="ifsc">IFSC*</label>
                    <input type="text" placeholder="IFSC" v-model.trim="ifsc.val" @blur="clearValidity('ifsc')" id="ifsc">
                    <transition name="form-fade" mode="out-in">
                        <p v-if="!ifsc.isValid" class="h-4 text-xs text-red-600 ml-1">
                            {{ ifsc.msg }}
                        </p>
                    </transition>
                </div>
                <div class="flex flex-col mt-4" :class="{ invalid: !bankName.isValid }">
                    <label for="bankName">Bank Name*</label>
                    <input type="text" placeholder="bankName" v-model.trim="bankName.val" @blur="clearValidity('bankName')" id="bankName">
                    <transition name="form-fade" mode="out-in">
                        <p v-if="!bankName.isValid" class="h-4 text-xs text-red-600 ml-1">
                            {{ bankName.msg }}
                        </p>
                    </transition>
                </div>
                <div class="flex justify-center mt-8">
                    <div @click.stop="submitForm" class="w-32 flex justify-center items-center border-2 font-medium border-red-600 text-white hover:text-red-600 bg-red-600 hover:bg-white rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">{{ getBtnText }}</div>
                </div>
            </div>
        </div>
        <div class="h-full fixed flex justify-center items-center" v-if="isLoading">
            <base-page-spinner-new type="spin" class-list="h-20"></base-page-spinner-new>
        </div>
    </div>
</template>

<script>
import http from "../../http-common.js";
export default {
  name: "create-payin",
  props: ["refID"],
  data() {
    return {
        error: null,
        showForm: false,
        amount: {
            val: null,
            isValid: true,
            msg: "",
        },
        accountNumber: {
            val: "",
            isValid: true,
            msg: "",
        },
        ifsc: {
            val: "",
            isValid: true,
            msg: "",
        },
        bankName: {
            val: "",
            isValid: true,
            msg: "",
        },
        formIsValid: true,
        isLoading: false,
    };
  },
  created() {
    this.isValidOrder();
  },
computed: {
    getBtnText() {
        if (this.isLoading) {
            return "Adding...";
        } else {
            return "Add";
        }
    }
},
  methods: {
    closeTheDialogBox() {
      this.error = null;
    },
    async isValidOrder() {
        let url = `/order-creator/isValidOrder/${this.refID}?type=payout&isPayoutLink=1`;
        try {
            const response = await http.get(url);
            if (response.status == 200 && response.data.success) {
                this.showForm = true;
            } else {
                this.error = response.data.message;
            }
        } catch (error) {
            this.error = error;
        }
    },
    allowNumbersOnly(event) {
        const charCode = event.which || event.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            event.preventDefault();
        }
    },
    clearValidity(input) {
        this[input].isValid = true;
        this[input].msg = "";
    },
    validateForm() {
        this.formIsValid = true;

        if (this.amount.val === null || this.amount.val === "") {
            this.amount.isValid = false;
            this.amount.msg = "Amount must not be empty.";
            this.formIsValid = false;
        }
        if (this.accountNumber.val === "") {
          this.accountNumber.isValid = false;
          this.accountNumber.msg = "Account Number must not be empty.";
          this.formIsValid = false;
        }
        if (this.ifsc.val === "") {
          this.ifsc.isValid = false;
          this.ifsc.msg = "IFSC must not be empty.";
          this.formIsValid = false;
        }
        if (this.bankName.val === "") {
          this.bankName.isValid = false;
          this.bankName.msg = "Bank Name must not be empty.";
          this.formIsValid = false;
        }
    },
    async submitForm() {
        this.validateForm();

        if (!this.formIsValid) {
            return;
        }

        const formData = {
            refID: this.refID,
            amount: parseInt(this.amount.val),
            type: "payout",
            accountNumber: this.accountNumber.val,
            ifsc: this.ifsc.val,
            bankName: this.bankName.val,
        }

        this.isLoading = true;

        try {
            let url = `/order-creator/create-manual-order`;
            const response = await http.post(
                url,
                formData,
            );
            if (response.status == 201 && response.data.success) {
                
                this.$swal.fire({
                    icon: 'success',
                    title: 'Congratulations!',
                    text: "Your fund has been added successfully.",
                }).then((result) => {
                    if (result.value || result.dismiss) {
                        this.amount.val = null;
                        this.accountNumber.val = "";
                        this.ifsc.val = "";
                        this.bankName.val = "";
                        this.$router.replace("/success");
                    }
                })

            } else {
                this.error = response.data.message;
            }
        } catch (error) {
            this.error = error;
        }

        this.isLoading = false;
    }
  },
}
</script>

<style lang="scss" scoped>
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

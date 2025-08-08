<template>
    <div class="h-full w-full flex flex-row flex-wrap">
      <div class="w-1/2 flex flex-col">
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Receipt:</div>
          <div class="text-color-2 text-sm font-semibold ml-2 uppercase">
            {{ item.receiptId }}
          </div>
        </div>
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Client Name:</div>
          <div class="text-color-2 text-sm font-semibold ml-2">
            {{ item.customerName }}
          </div>
        </div>
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Client UPI:</div>
          <div class="text-color-2 text-sm font-semibold ml-2">
            {{ item.customerUPIID }}
          </div>
        </div>
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Customer UTR:</div>
          <div class="text-color-2 text-sm font-semibold ml-2">
            {{ item.customerUtr }}
          </div>
        </div>
      </div>
      <div class="w-1/2 flex flex-col">
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Order Id:</div>
          <div class="text-color-2 text-sm font-semibold ml-2 break-all">
            {{ item.merchantOrderId }}
          </div>
        </div>
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Assigned To:</div>
          <div class="text-color-2 text-sm font-semibold ml-2">
            {{ item.validatorUsername }}
          </div>
        </div>
        <div v-if="isAdmin" class="flex mb-2">
          <div class="text-color-1 text-sm">Assigned UPI:</div>
          <div class="text-color-2 text-sm font-semibold ml-2">
            {{ item.validatorUPIID }}
          </div>
        </div>
        <div class="flex mb-2">
          <div class="text-color-1 text-sm">Created:</div>
          <div class="text-color-2 text-sm font-semibold ml-2">
            {{ formatDate }}
          </div>
        </div>
        <div class="flex mb-2 items-center">
          <div class="text-color-1 text-sm">Amount:</div>
          <div class="text-color-2 text-lg text-green-600 font-semibold ml-2">
            {{ getAmount }}
          </div>
        </div>
      </div>

      <div class="w-full mt-4 border-2 border-wizpay-red p-8 rounded-lg flex flex-col">
        <div class="w-full flex items-center" :class="{ invalid: !editAmount.isValid }">
          <label for="editAmount" class="w-24 mr-2 mb-0">Edit Amount:</label>
          <div class="flex-grow flex flex-col">
            <input type="text" id="editAmount" v-model.trim="editAmount.val" placeholder="Edit Amount" @blur="clearValidity('editAmount')" />
          </div>
        </div>
        <div class="flex">
          <div class="w-24 mr-2"></div>
          <transition name="form-fade" mode="out-in">
            <p v-if="!editAmount.isValid" class="h-4 text-xxs text-red-600">{{ editAmount.msg }}</p>
          </transition>
        </div>

        <div class="mt-4 flex flex-row flex-wrap">
            <div class="w-1/2 pr-2">
                <div @click.stop="selectButton('utr')" :class="selectedButton == 'utr' ? 'bg-wizpay-red text-white' : 'bg-gray-300 text-wizpay-red'" class="hover:bg-wizpay-red hover:text-white text-xs font-semibold flex-grow py-2 rounded-lg cursor-pointer flex justify-center">Enter UTR</div>
            </div>
            <div class="w-1/2 pl-2">
                <div @click.stop="selectButton('screenshot')" :class="selectedButton == 'screenshot' ? 'bg-wizpay-red text-white' : 'bg-gray-300 text-wizpay-red'" class="hover:bg-wizpay-red hover:text-white text-xs font-semibold flex-grow py-2 rounded-lg cursor-pointer flex justify-center">Upload Screenshot</div>
            </div>
        </div>
        <div v-if="selectedButton == ''" class="mt-2 text-xxs text-wizpay-red text-center">Select the preferred option to add the UTR.</div>
        <div v-else>
            <div v-if="selectedButton == 'utr'">
                <div class="mt-2 flex flex-col"> 
                    <div class="flex-grow">
                        <input type="text" class="h-8 bg-wizpay-gray text-xs text-center" placeholder="Enter UTR" v-model="customerUtr.val" @blur="clearValidity('customerUtr')" />
                    </div>
                    <transition name="form-fade" mode="out-in">
                        <p v-if="!customerUtr.isValid" class="h-4 text-xxs text-red-600 text-center">{{ customerUtr.msg }}</p>
                    </transition>
                    <div class="flex justify-center mt-2">
                        <div @click.stop="addCustomerUtr" class="h-8 flex items-center justify-center border px-4 bg-wizpay-red hover:bg-white text-white hover:text-wizpay-red border-wizpay-red rounded-lg cursor-pointer">Submit</div>
                    </div>
                </div>
            </div>
            <div v-else-if="selectedButton == 'screenshot'">
                <div class="mt-2">     
                    <div class="flex flex-col">
                        <div class="flex-grow">
                            <input ref="uploadScreenshot" class="hidden" id="uploadScreenshot" @change="handleUploadScreenshot" type="file" accept="image/*">
                            <div v-if="uploadScreenshotPreview" class="flex justify-between items-center border rounded-lg p-1">
                                <div class="border p-1 rounded-lg">
                                    <img @click.stop="onPickFile('uploadScreenshot')" class="h-16 object-contain cursor-pointer" :src="uploadScreenshotPreview">
                                </div>
                                <div @click.stop="cancelUploadedScreenshot" class="cursor-pointer h-6 w-6 border border-red-600 rounded-full flex flex-col items-center justify-center group">
                                    <icon-close class="h-4 w-4 text-red-600 group-hover:text-white group-hover:bg-red-600 rounded-full"></icon-close>
                                </div>
                            </div>
                            <div v-else @click.stop="onPickFile('uploadScreenshot')" class="h-8 bg-wizpay-gray text-gray-400 text-xs text-center rounded-lg cursor-pointer flex justify-center items-center">Upload Payment Receipt</div>
                        </div>
                        <p v-if="!uploadScreenshot.isValid" class="text-xxs text-red-600 text-center">{{ uploadScreenshot.msg }}</p>
                        <div class="flex justify-center mt-2">
                            <div @click.stop="submitUploadScreenshot" class="h-8 flex items-center justify-center border px-4 bg-wizpay-red hover:bg-white text-white hover:text-wizpay-red border-wizpay-red rounded-lg cursor-pointer">
                            Submit
                            </div>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
      </div>
      <div class="h-full flex justify-center items-center" v-if="isLoading">
        <base-page-spinner-new type="spin" class-list="h-20"></base-page-spinner-new>
        </div>
    </div>
  </template>
  
<script>
import IconClose from "../../components/icons/IconClose.vue";
import http from "../../http-common.js";
  export default {
    name: "add-utr-form",
    props: ["item"],
    emits: ["form-response"],
    components: { IconClose, },
    data() {
      return {
        selectedButton: "",
        editAmount: {
          val: this.item.amount,
          isValid: true,
          msg: "",
        },
        customerUtr: {
          val: "",
          isValid: true,
          msg: "",
        },
        uploadScreenshotPreview: null,
        uploadScreenshot: {
            val: null,
            isValid: true,
            msg: "",
        },
        formIsValid: true,
        isLoading: false,
      };
    },
    computed: {
      getAmount() {
        if (this.item.amount) {
          if (this.item.txnFee) {
            return this.item.amount
          } else {
            return parseInt(this.item.amount);
          }
        } else {
          return "";
        }
      },
      isAdmin() {
        if (this.$store.getters.isAdmin) {
          return true;
        } else {
          return false;
        }
      },
      formatDate() {
        const date = new Date(this.item.createdAt);
  
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const ampm = hours >= 12 ? "pm" : "am";
  
        const formattedDate = `${day}-${month}-${year} ${hours %
          12}:${minutes}:${seconds} ${ampm}`;
  
        return formattedDate;
      },
    },
    methods: {
        clearValidity(input) {
            this[input].isValid = true;
            this[input].msg = "";
        },
        validateForm(formName) {
          this.formIsValid = true;
          if (this.editAmount.val === "") {
            this.editAmount.isValid = false;
            this.editAmount.msg = "Edit amount must not be empty!";
            this.formIsValid = false;
          }
          if (formName == 'enterUtr') {
            if (this.customerUtr.val == "") {
              this.customerUtr.msg = "You must enter UTR";
              this.customerUtr.isValid = false;
              this.formIsValid = false;
            }
          }
          if (formName == 'uploadScreenshot') {
            if (this.uploadScreenshot.val === null) {
                this.uploadScreenshot.isValid = false;
                this.uploadScreenshot.msg = "You must upload a screenshot.";
                this.formIsValid = false;
            }
          }
        },
        async addCustomerUtr() {
          this.validateForm('enterUtr');

          if (!this.formIsValid) {
            return;
          }
            
          try {
              this.isLoading = true;
              const response = await http.post(`/subadmin/${this.item.refID}/addCustomerUtr`, { edit_amount: this.editAmount.val, customerUtr: this.customerUtr.val, });
              if (response.status == 201) {
                  if (response.data.status) {
                      let data = {
                          refID: this.item.refID,
                          customerUtr: this.customerUtr.val,
                      };
                      this.$store.commit("payin/updateCustomerUtr", data);
                      if (response.data.data.paymentStatus =='approved') {
                          data.transactionID = this.customerUtr.val;
                          this.$store.commit("payin/setPaymentStatusAndUtr", data);
                      }
                      if (this.editAmount.val != this.item.amount) {
                        this.$store.commit("payin/updateAmountAndStatus", {
                          refID: this.item.refID,
                          amount: this.editAmount.val,
                          paymentStatus: response.data.data.paymentStatus,
                        });
                      }
                  }
                  this.$emit("form-response", response.data.status, response.data.message);
              } else {
                  console.log(response);
              }
              this.isLoading = false;
          } catch (error) {
              this.isLoading = false;
              this.$emit("form-response", false, error.message || "Something failed!");
          }
        },
        selectButton(btnName) {
            this.selectedButton = btnName;
        },
        handleUploadScreenshot(event) {
            this.uploadScreenshot.isValid = true;
            this.uploadScreenshot.msg = "";
            const file = event.target.files[0];
            if (file) {
                if (!file.type.includes('image/')) {
                    this.uploadScreenshot.isValid = false;
                    this.uploadScreenshot.msg = 'Only JPG, JPEG and PNG files are allowed.';
                } else if (file.size > 2 * 1024 * 1024) {
                    this.uploadScreenshot.isValid = false;
                    this.uploadScreenshot.msg = 'File size must be less than 2MB.';
                } else {
                    this.uploadScreenshot.isValid = true;
                    this.uploadScreenshot.msg = '';
                    this.uploadScreenshot.val = file;
                    this.uploadScreenshotPreview = URL.createObjectURL(file);
                }
            }
        },
        cancelUploadedScreenshot() {
            this.uploadScreenshot.val = null;
            this.uploadScreenshotPreview = null;
            this.$refs.uploadScreenshot.value = null;
        },
        onPickFile(ref) {
            this.$refs[ref].click();
        },
        async submitUploadScreenshot() {
            this.validateForm('uploadScreenshot');
        
            if (!this.formIsValid) {
                return;
            }

            const formData = new FormData();
            formData.append('upload_screenshot', this.uploadScreenshot.val);
            formData.append('edit_amount', this.editAmount.val);
            
            this.isLoading = true;

            try {
                const response = await http.post(`subadmin/${this.item.refID}/upload-screenshot`,formData,
                    {
                        headers: {
                        'Content-Type': 'multipart/form-data',
                        },
                    }
                );
                if (response.status == 201) {
                    if (response.data.status) {
                        let data = {
                            refID: this.item.refID,
                            customerUtr: response.data.data.customerUtr,
                            uploadScreenshot: response.data.data.upload_screenshot,
                        };
                        this.$store.commit("payin/updateCustomerUtrAndAttachment", data);
                        if (response.data.data.paymentStatus =='approved') {
                            data.transactionID = response.data.data.customerUtr;
                            this.$store.commit("payin/setPaymentStatusAndUtr", data);
                        }
                        if (this.editAmount.val != this.item.amount) {
                          this.$store.commit("payin/updateAmountAndStatus", {
                            refID: this.item.refID,
                            amount: this.editAmount.val,
                            paymentStatus: response.data.data.paymentStatus,
                          });
                        }
                    }
                    this.$emit("form-response", response.data.status, response.data.message);
                } else {
                    alert('failed', 'Failed to create the ticket. Please try again!');
                }
            } catch (error) {
                console.log(error);
            }

            this.isLoading = false;

        },
    },
  };
  </script>
  
  <style lang="scss" scoped>
    .text-xxs {
        font-size: 10px;
    }
    .form-fade-enter-active, .form-fade-leave-active {
            transition: all 0.5s ease;
    }
    .form-fade-enter-from, .form-fade-leave-to {
        opacity: 0;
        height: 0px;
    }
  </style>
  
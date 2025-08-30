<template>
    <div class="w-full flex items-center">
        <div class="flex-shrink-0 mr-4 text-lg font-semibold">
            <input type="checkbox" v-model="isSelected" @change="selectItem">
        </div>
        <div class="flex-grow rounded-xl flex flex-col bg-1 shadow-lg relative mb-4">
            <base-dialog :show="!!error" title="An error occurred!" @close="handleError">
                <p>{{ error }}</p>
            </base-dialog>
            <base-toast v-if="!!baseToast.message" :message="baseToast.message" :type="baseToast.type"
                @close="handleBaseToast"></base-toast>
            <base-dialog :show="showPayOutApproveModal" title="Approve Pay Out Order"
                @close="showPayOutApproveModal = false">
                <pay-out-approve-form :key="item.receiptId" :item="selectedItem"
                    @form-response="formResponse"></pay-out-approve-form>
            </base-dialog>
            <div class="flex flex-row flex-wrap">

                <div class="w-3/4 p-4 flex flex-row flex-wrap">
                    <div class="w-1/2 flex flex-col">
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Receipt:
                            </div>
                            <div class="text-color-2 font-semibold ml-2 uppercase">
                                {{ item.receiptId }}
                            </div>
                        </div>
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Client Name:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.customerName }}
                            </div>
                        </div>
                        <div v-if="isAdmin" class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Client UPI:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.customerUPIID }}
                            </div>
                        </div>
                        <!-- <div class="flex mb-2 items-center">
                  <div class="text-color-1 text-sm uppercase flex-shrink-0">Client Mobile:</div>
                  <div class="text-color-2 font-semibold ml-2">
                    {{ item.customerMobile }}
                  </div>
                </div>
                <div class="flex">
                  <div class="text-color-1 text-sm uppercase flex-shrink-0">Client IP:</div>
                  <div class="text-color-2 font-semibold ml-2">
                    {{ item.customerIp }}
                  </div>
                </div> -->
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Created At:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ formatDate(item.createdAt) }}
                            </div>
                        </div>
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Approved At:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ formatDate(item.updatedAt) }}
                            </div>
                        </div>
                        <div v-if="isAdmin || isSubAdmin" class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Approved By:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ getApprovedBy }}
                            </div>
                        </div>
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Account Number:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.accountNumber }}
                            </div>
                        </div>
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                IFSC:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.ifsc }}
                            </div>
                        </div>
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Bank Name:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.bankName }}
                            </div>
                        </div>
                    </div>
                    <div class="w-1/2 flex flex-col">
                        <!-- <div class="flex mb-2 items-center">
                  <div class="text-color-1 text-sm uppercase flex-shrink-0">Platform:</div>
                  <div class="text-color-2 font-semibold ml-2">
                    {{ item.clientName }}
                  </div>
                </div> -->
                        <div class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Order Id:
                            </div>
                            <div class="text-color-2 font-semibold ml-2 break-all">
                                {{ item.merchantOrderId }}
                            </div>
                        </div>
                        <!-- <div class="flex mb-2 items-center">
                  <div class="text-color-1 text-sm uppercase flex-shrink-0">Created:</div>
                  <div class="text-color-2 font-semibold ml-2">
                    {{ item.createdAt }}
                  </div>
                </div> -->
                        <div v-if="isAdmin || isSubAdmin" class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Assigned To:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.validatorUsername }}
                            </div>
                        </div>
                        <div v-if="isAdmin || isSubAdmin" class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Assigned UPI:
                            </div>
                            <div class="text-color-2 font-semibold ml-2 break-all">
                                {{ item.validatorUPIID }}
                            </div>
                        </div>
                        <div v-if="!isAdmin" class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Client UPI:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.customerUPIID }}
                            </div>
                        </div>
                        <div class="flex items-center mb-2">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                UTR:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.transactionID }}
                            </div>
                        </div>
                        <div class="flex items-center mb-2">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Customer UTR:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.customerUtr }}
                            </div>
                        </div>
                        <div class="flex items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Website:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.website }}
                            </div>
                        </div>
                        <div v-if="item.created_by" class="flex mb-2 items-center">
                            <div class="text-color-1 text-sm uppercase flex-shrink-0">
                                Order Creator:
                            </div>
                            <div class="text-color-2 font-semibold ml-2">
                                {{ item.created_by }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w-1/4 flex flex-col items-center justify-center  p-4  border-l relative">
                    <div :class="getClass" class="px-4 py-2 rounded-full text-white uppercase text-xs">
                        {{ item.paymentStatus }}
                    </div>

                    <div v-if="item.payout_type == 'instant' && item.paymentStatus == 'unassigned'" :class="getClass"
                        class="px-4 py-2  mt-2  rounded-full text-white uppercase text-xs">
                        {{ item.payout_type == 'instant' ? 'Waiting for E2E Payment!' : '' }}
                    </div>

                    <!-- Only show timer if order has been accessed (has instant_payout_expiry_at set) -->
                    <div v-if="item.payout_type == 'instant' && item.paymentStatus == 'unassigned' && item.instant_payout_expiry_at" :class="getClass"
                        class="px-4 py-2  mt-2  rounded-full text-white uppercase text-xs">
                        {{ formattedTimeForInstantWaiting }}
                    </div>

                    <!-- Show "Not Accessed" message for orders without timer -->
                    <div v-if="item.payout_type == 'instant' && item.paymentStatus == 'unassigned' && !item.instant_payout_expiry_at" :class="getClass"
                        class="px-4 py-2  mt-2  rounded-full text-white uppercase text-xs">
                        Customer Not Accessed Yet
                    </div>

                    <div v-if="item.is_instant_payout && item.payout_type == 'instant' && (item.instant_balance > 0)">
                        <div v-if="item.instant_balance" class="text-2xl font-semibold mt-2">
                            {{ parseInt(item.instant_balance) }}
                            <!-- <span class="uppercase">INR</span> -->
                        </div>
                    </div>
                    <div v-else>
                        <div v-if="item.amount" class="text-2xl font-semibold mt-2">
                            {{ parseInt(item.amount) }}
                            <!-- <span class="uppercase">INR</span> -->
                        </div>
                    </div>





                    <div class="w-full flex justify-between items-center flex-wrap mt-2">
                        <div @click.stop="approveOrder" v-if="showApproveRejectBtn"
                            class="w-24 flex justify-center mt-2 bg-green-600 px-4 py-2 rounded-lg shadow-lg text-white uppercase text-sm font-medium cursor-pointer zoom-in">
                            Approve
                        </div>
                        <div @click.stop="rejectOrder" v-if="showApproveRejectBtn"
                            class="w-24 flex justify-center mt-2 bg-red-600 px-4 py-2 rounded-lg shadow-lg text-white uppercase text-sm font-medium cursor-pointer zoom-in">
                            Reject
                        </div>

                    </div>

                </div>
            </div>

            <div class="w-full px-4 py-6" v-if="item.payout_type == 'instant'">
                <!-- Batch Payout Table -->
                <button @click.stop="loadTransactionLogs(item)"
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700  zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                    Load Transaction Logs
                </button>




                <div class="bg-white shadow rounded-lg overflow-x-auto w-full mx-auto">
                    <table class="min-w-full table-auto">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">#Batch Order</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">#Created On</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">Amount</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">Status</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">Transaction ID</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">Payment From</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">Payment To</th>
                                <th class="px-4 py-2 text-left text-gray-600 font-semibold">Confirmed By Customer</th>
                            </tr>
                        </thead>
                        <tbody>

                            <!-- Transaction 1 -->
                            <tr class="border-b" v-for="(batch, index) in batchPayouts" :key="index">
                                <td class="px-4 py-2 text-gray-700">BSO{{ index + 1 }}- Order ID #{{ batch.id }} </td>
                                <td class="px-4 py-2 text-gray-700">{{ formatDate(batch.created_at) }}
                                </td>
                                <td class="px-4 py-2 text-gray-700">{{ batch.amount }}</td>
                                <td class="px-4 py-2 text-gray-700">{{ batch.status }}</td>
                                <td class="px-4 py-2 text-gray-700">{{ batch.utr_no }}</td>
                                <td class="px-4 py-2 text-gray-700">{{ batch.payment_from }}</td>
                                <td class="px-4 py-2 text-gray-700">{{ batch.payment_to }}</td>
                                <td class="px-4 py-2 text-gray-700">{{ batch.confirmed_by_customer_at == null ? 'NO' :
                                    'YES' }} </td>

                            </tr>
                            <tr class="border-b" v-if="batchPayouts.length == 0 && touched">
                                <td class="px-4 py-2 text-gray-700" @click.stop="loadTransactionLogs(item)"> No Batch
                                    orders Currently! click to refresh </td>
                            </tr>



                        </tbody>
                    </table>
                </div>
            </div>



        </div>
    </div>
</template>

<script>
import PayOutApproveForm from "./PayOutApproveForm.vue";
import moment from 'moment-timezone';
import http from "../../http-common";

export default {
    name: "pay-out-item",
    emits: ["select-item"],
    props: ["item", "slNo", "selectAll", "clearSelected"],
    components: {
        PayOutApproveForm,
    },
    data() {
        return {
            touched: false,
            createdAt: "",
            batchPayouts: [],
            showPayOutApproveModal: false,
            baseToast: {
                type: "",
                message: "",
            },
            error: null,
            selectedItem: null,
            isSelected: false,
            instantTimeLeft: 25 * 60 * 1000, // 25 minutes to match backend logic (15 + 10 extension)
            instantIntervalId: null,
            instantTimeExpired: false,
            serverTimeNow: null,
        };
    },


    created() {
        this.createdAt = this.item.createdAt;
        this.startCountdownForInstant();
    },

    watch: {
        selectAll(newVal) {
            this.isSelected = newVal;
        },
        clearSelected() {
            this.isSelected = false;
        },
    },
    computed: {

        formattedTimeForInstantWaiting() {
            const minutes = Math.floor((this.instantTimeLeft / 1000) / 60);
            const seconds = Math.floor((this.instantTimeLeft / 1000) % 60);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        },
        showApproveRejectBtn() {

            if (this.item.payout_type == 'instant') {
                return (this.item.paymentStatus == 'pending' || (this.item.paymentStatus == 'expired' && this.isAdmin)) && this.item.instant_balance;
            } else {
                if (this.item.isPayoutLink) {
                    return (this.item.paymentStatus == 'pending' || (this.item.paymentStatus == 'expired' && this.isAdmin)) && this.item.amount && this.item.isApprovedByMOU;
                } else {
                    return (this.item.paymentStatus == 'pending' || (this.item.paymentStatus == 'expired' && this.isAdmin)) && this.item.amount;
                }
            }
        },
        getClass() {
            if (this.item.paymentStatus == "pending") {
                return "bg-blue-500";
            } else if (this.item.paymentStatus == "approved") {
                return "bg-green-600";
            } else if (this.item.paymentStatus == "rejected" || this.item.paymentStatus == "failed") {
                return "bg-yellow-600";
            } else if (this.item.paymentStatus == "unassigned") {
                return "bg-gray-600";
            } else if (this.item.paymentStatus == "expired") {
                return "bg-red-600";
            } else {
                return "bg-black";
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
        getApprovedBy() {
            if (this.item.approvedBy == "user") {
                return `${this.item.validatorUsername}(User)`;
            } else if (this.item.approvedBy == "subadmin") {
                return `${this.item.approvedByUsername
                    ? this.item.approvedByUsername
                    : this.item.validatorUsername
                    }(Sub Admin)`;
            } else if (this.item.approvedBy == "admin") {
                return "Admin";
            } else {
                return "";
            }
        },
    },
    methods: {

        async loadTransactionLogs(itemData) {
            let url = `/orders/${itemData.refID}/batch-payout-details`;
            try {
                const response = await http.get(url);
                if (response.status == 200) {
                    this.touched = true;

                    try {
                        if (response.data.data.batchItems.length > 0) {
                            let batches = response.data.data.batchItems;

                            this.batchPayouts = batches;
                            console.log(batches);
                        }
                    } catch (e) {
                        console.log("sdsddd");
                    }

                    console.log(response.data);
                }

            } catch (error) {
                //console.log(error);
            }



        },


        // from gpt

        startCountdownForInstant() {
            // Only show timer for instant payout orders that are unassigned AND have backend timer set
            if (this.item.payout_type !== 'instant' || 
                this.item.paymentStatus !== 'unassigned' || 
                !this.item.instant_payout_expiry_at) {
                console.log("Skipping timer - conditions not met:", {
                    payout_type: this.item.payout_type,
                    paymentStatus: this.item.paymentStatus,
                    instant_payout_expiry_at: this.item.instant_payout_expiry_at
                });
                return;
            }

            // Get the time zone from the environment variable (e.g., 'Asia/Kolkata')
            const timeZone = process.env.VUE_APP_TIMEZONE;

            // Use the backend timer instead of calculating from createdAt
            const backendExpiryTime = moment.tz(this.item.instant_payout_expiry_at, timeZone).valueOf();
            
            console.log("Using backend timer expiry:", moment.tz(this.item.instant_payout_expiry_at, timeZone).format("YYYY-MM-DD HH:mm:ss"));

            // Start the countdown by setting an interval
            this.instantIntervalId = setInterval(() => {
                // Get the current time in the same time zone (Asia/Kolkata)
                const now = moment.tz(new Date(), timeZone).valueOf();

                // Calculate the remaining time using backend expiry
                const timeLeft = Math.max(backendExpiryTime - now, 0);

                // Update instantTimeLeft
                this.instantTimeLeft = timeLeft;

                // Check if the countdown expired
                if (this.instantTimeLeft === 0) {
                    this.instantTimeExpired = true; // Countdown expired
                    clearInterval(this.instantIntervalId); // Clear the interval
                    console.log("Admin dashboard timer expired for order:", this.item.refID);
                }
            }, 1000); // Update every second
        },




        // startCountdownForInstant() {
        //     const timeZone = process.env.VUE_APP_TIMEZONE;
        //     console.log(timeZone);
        //     let localTime = moment(this.createdAt).format('YYYY-MM-DD HH:mm:ss');
        //     console.log(localTime);
        //     // Parse the naive datetime as Asia/Kolkata
        //     const createdAtMoment = moment(localTime);
        //     const createdAtTime = createdAtMoment.valueOf(); // Correct UTC timestamp

        //     // Calculate end time
        //     const endTime = createdAtTime + this.instantTimeLeft;

        //     // Set up the countdown interval
        //     this.instantIntervalId = setInterval(() => {
        //         const now = Date.now(); // Current UTC timestamp
        //         this.instantTimeLeft = Math.max(endTime - now, 0); // Calculate remaining time

        //         if (this.instantTimeLeft === 0) {
        //             this.instantTimeExpired = true;
        //             clearInterval(this.instantIntervalId);
        //         }
        //     }, 1000);
        // },


        // old one commented...

        // startCountdownForInstant() {
        //     const timeZone = process.env.VUE_APP_TIMEZONE;
        //     let localTime = moment(this.createdAt).tz(timeZone).format('YYYY-MM-DD HH:mm:ss');
        //     // Parse the naive datetime as Asia/Kolkata
        //     const createdAtMoment = moment.tz(localTime, timeZone);
        //     const createdAtTime = createdAtMoment.valueOf(); // Correct UTC timestamp

        //     // Calculate end time
        //     const endTime = createdAtTime + this.instantTimeLeft;

        //     // Set up the countdown interval
        //     this.instantIntervalId = setInterval(() => {
        //         const now = moment.tz(new Date(), timeZone).valueOf(); // Current UTC time
        //         this.instantTimeLeft = Math.max(endTime - now, 0); // Calculate remaining time

        //         if (this.instantTimeLeft === 0) {
        //             this.instantTimeExpired = true;
        //             clearInterval(this.instantIntervalId);
        //         }
        //     }, 1000);
        // },


        formatDate(inputDate) {
            const x = inputDate.replace("T", " ");
            const y = x.replace(".000Z", "");

            const date = new Date(y);

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
        approveOrder() {
            this.selectedItem = this.item;
            this.showPayOutApproveModal = true;
        },
        rejectOrder() {
            this.$swal
                .fire({
                    title: "Are you sure?",
                    text: "You won't be able to revert this!",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Yes, reject it!",
                })
                .then(async (result) => {
                    if (result.isConfirmed) {
                        const formData = {
                            refID: this.item.refID,
                            paymentStatus: "failed",
                        };
                        try {
                            await this.$store.dispatch("payin/approvePayOutOrder", formData);
                            this.$swal.fire(
                                "Rejected!",
                                `Pay Out Order with order id: ${this.item.merchantOrderId} has been rejected.`,
                                "success"
                            );
                        } catch (error) {
                            this.error = error.message || "Something failed!";
                            this.$swal.fire(
                                "Failed!",
                                `Pay Out Order with order id: ${this.item.merchantOrderId} is not updated. ${this.error}`,
                                "error"
                            );
                        }
                    }
                });
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
        formResponse(status, message) {
            this.showPayOutApproveModal = false;
            if (status == "success") {
                this.baseToast.type = status;
                this.baseToast.message = message;
                let $this = this;
                setTimeout(() => {
                    $this.handleBaseToast();
                }, 1000);
            } else {
                this.error = message;
            }
        },
        selectItem() {
            this.$emit('select-item', this.item.refID, this.isSelected);
        },
    },
};
</script>

<style lang="scss" scoped>
.bg-1 {
    background-color: #f8f9fa;
}

.bg-2 {
    background-image: linear-gradient(310deg, #7928ca, #ff0080);
}

.text-color-1 {
    color: #67748e;
}

.text-color-2 {
    color: #344767;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.max-w-200 {
    max-width: 200px;
}
</style>

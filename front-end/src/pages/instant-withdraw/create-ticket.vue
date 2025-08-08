<template>
    <div class="w-full flex flex-col">
        <div class="flex">
            <div class="flex flex-col">
                <div v-if="attachmentPreview" class="relative">
                    <div @click.stop="cancelUploadedPhoto" class="absolute top-0 left-0 cursor-pointer h-6 w-6 border border-red-600 rounded-full flex flex-col items-center justify-center">
                        <icon-close class="h-4 w-4 text-red-600"></icon-close>
                    </div>
                    <img class="h-48 object-contain" :src="attachmentPreview" >
                </div>
                <img v-else class="h-48" src="../../assets/images/default/thumbnail.jpeg" >
                <div class="flex justify-start mt-4" :class="{ invalid: !attachment.isValid }">
                    <input ref="attachment" class="hidden" id="attachment" @change="handleattachment" type="file" accept="image/*">
                    <label @click.stop="onPickFile" class="text-twelve flex items-center cursor-pointer">
                        <icon-plus class="h-4 w-4"></icon-plus>
                        <span class="ml-1">Upload Attachment* <span class="text-sm text-gray-600">(JPG, JPEG, PNG max 2MB)</span> </span>
                    </label>
                </div>
                <transition name="form-fade" mode="out-in">
                    <p v-if="!attachment.isValid" class="h-4 text-xs text-red-600">
                        {{ attachment.msg }}
                    </p>
                </transition>
            </div>
        </div>
        <div class="flex flex-col mt-4" :class="{ invalid: !utr.isValid }">
            <label for="utr">Enter UTR*</label>
            <input type="text" v-model.trim="utr.val" @blur="clearValidity('utr')" id="utr">
            <transition name="form-fade" mode="out-in">
                <p v-if="!utr.isValid" class="h-4 text-xs text-red-600 ml-1">
                    {{ utr.msg }}
                </p>
            </transition>
        </div>
        <div class="flex flex-col mt-4">
            <label for="comment">Comment</label>
            <div class="h-32 rounded-lg">
                <textarea id="comment" v-model.trim="comment.val" placeholder="Add your comments..." class="bg-white resize-none w-full h-full outline-none text-sm border p-4 rounded-lg"></textarea>
            </div>
        </div>
        <div class="flex justify-center mt-8">
            <div @click.stop="submitForm" class="w-32 flex justify-center items-center border-2 font-medium border-green-600 text-white hover:text-green-600 bg-green-600 hover:bg-white rounded-lg px-5 py-2 uppercase text-sm cursor-pointer">{{ getBtnText }}</div>
        </div>
        <div class="h-full flex justify-center items-center" v-if="isLoading">
            <base-page-spinner-new type="spin" class-list="h-20"></base-page-spinner-new>
        </div>
    </div>
</template>

<script>
import IconClose from "../../components/icons/IconClose.vue";
import IconPlus from "../../components/icons/IconPlus.vue";
import http from "../../http-common.js";
export default {
    name: "create-ticket",
    emits: ["created", "failed"],
    props: ["vendor"],
    components: {
        IconClose,
        IconPlus,
    },
    data() {
        return {
            attachmentPreview: null,
            attachment: {
                val: null,
                isValid: true,
                msg: "",
            },
            utr: {
                val: "",
                isValid: true,
                msg: "",
            },
            comment: {
                val: "",
                isValid: true,
                msg: "",
            },
            formIsValid: true,
            isLoading: false,
        };
    },
    computed: {
        getBtnText() {
            if (this.isLoading) {
                return "Creating...";
            } else {
                return "Create";
            }
        }
    },
    methods: {
        cancelUploadedPhoto() {
            this.attachment.val = null;
            this.attachmentPreview = null;
        },
        handleattachment(event) {
            this.attachment.isValid = true;
            this.attachment.msg = "";
            const file = event.target.files[0];

            // Check if a file is selected
            if (file) {
                // Check if the file is an image (JPEG or PNG)
                if (!file.type.includes('image/')) {
                    this.attachment.isValid = false;
                    this.attachment.msg = 'Only JPG, JPEG and PNG images are allowed.';
                } else if (file.size > 2 * 1024 * 1024) {
                    // Check if the file size is greater than 2MB
                    this.attachment.isValid = false;
                    this.attachment.msg = 'File size must be less than 2MB.';
                } else {
                    // File is valid
                    this.attachment.isValid = true;
                    this.attachment.msg = '';
                    this.attachment.val = file;

                    // Create a preview URL for the image
                    this.attachmentPreview = URL.createObjectURL(file);
                }
            }
        },
        onPickFile() {
            this.$refs.attachment.click();
        },
        clearValidity(input) {
            this[input].isValid = true;
            this[input].msg = "";
        },
        validateForm() {
            this.formIsValid = true;

            if (this.attachment.val === null) {
                if (this.attachment.isValid) {
                    this.attachment.isValid = false;
                    this.attachment.msg = "You must upload an attachment.";
                }
                this.formIsValid = false;
            }
            if (this.utr.val === "") {
                this.utr.isValid = false;
                this.utr.msg = "UTR must not be empty.";
                this.formIsValid = false;
            }   
        },
        async submitForm() {
            this.validateForm();

            if (!this.formIsValid) {
                return;
            }

            const formData = new FormData();
            formData.append('attachment', this.attachment.val);
            formData.append('utr', this.utr.val);
            formData.append('comment', this.comment.val);
            formData.append('vendor', this.vendor);

            this.isLoading = true;

            try {
                const response = await http.post(
                    `/ticket`,
                    formData,
                    {
                        headers: {
                        'Content-Type': 'multipart/form-data',
                        },
                    }
                );
                if (response.status == 201) {
                    this.$emit('created');
                } else {
                    this.$emit('failed', 'Failed to create the ticket. Please try again!');
                }
            } catch (error) {
                this.$emit('failed', error);
            }

            this.isLoading = false;

        },
    },
}
</script>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
<template>
    <div class="fixed z-50 inset-0 overflow-hidden">
        <div class="flex flex-col items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 transition-opacity">
                <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div :style="getWidth" class="inline-block align-bottom bg-white rounded-2xl text-left shadow-xl transform transition-all sm:align-middle sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl w-full relative">
                <div @click.stop="$emit('close')" class="absolute -right-2 -top-2 h-8 w-8 bg-white rounded-full border shadow flex flex-col justify-center items-center hover:bg-red-500 group cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 cursor-pointer text-gray-400 group-hover:text-white">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <div :style="getStyle" class="bg-white rounded-2xl w-full modal-max-ht flex flex-col">
                    <header>
                        <slot name="header">
                            <h2 :class="title ? 'border-b' : ''" class="px-8 py-4 text-lg sm:text-xl lg:text-2xl font-semibold text-heading">{{ title }}</h2>
                        </slot>
                    </header>
                    <div class="flex-auto flex flex-col overflow-y-auto mb-8">
                        <slot></slot>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "base-modal",
    emits: ["close"],
    props: {
        title: {
            type: String,
            required: false,
        },
        height: {
            type: String,
            required: false,
        },
        width: {
            type: String,
            required: false,
        },
    },
    computed: {
        getStyle() {
            if (this.height) {
                return `height:  ${this.height};`;
            } else {
                return ``;
            }
        },
        getWidth() {
            if (this.width) {
                return `width:  ${this.width};`;
            } else {
                return ``;
            }
        },
    },
}
</script>

<style lang="scss" scoped>
.modal-max-ht {
    max-height: calc(100vh - 100px);
}
</style>
<template>
    <div :style="getInlineStyle" class="fixed z-50 inset-0 overflow-hidden">
        <div class="flex flex-col items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 transition-opacity">
                <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div class="bg-white w-full h-screen relative flex flex-col">
                <div class="flex justify-between border-b">
                    <div class="flex-grow text-left">
                        <slot name="header">
                            <div class="px-8 py-4 flex justify-start items-center flex-wrap">
                                <icon-back @click.stop="$emit('close')" class="h-8 w-8 text-blue-600 mr-4"></icon-back>
                                <h2 class="text-lg sm:text-xl lg:text-2xl font-semibold text-heading">{{ title }}</h2>
                            </div>
                        </slot>
                    </div>
                    <div class="flex-shrink-0">
                        <div @click.stop="$emit('close')" class="h-8 w-8 bg-red-500 border shadow flex flex-col justify-center items-center hover:bg-red-600 group cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 cursor-pointer text-white group-hover:text-white">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="flex-auto w-full flex flex-col overflow-y-auto">
                    <slot></slot>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import IconBack from "../icons/IconBack.vue";
export default {
    name: "base-full-modal",
    emits: ["close"],
    components: {
        IconBack,
    },
    props: {
        title: {
            type: String,
            required: false,
        },
        height: {
            type: String,
            required: false,
        },
        inlineStyle: {
            type: String,
            required: false,
        },
    },
    computed: {
        getInlineStyle() {
            if (this.inlineStyle) {
                return this.inlineStyle;
            } else {
                return "";
            }
        },
    },
}
</script>
<template>
    <div class="flex flex-col overflow-x-auto">
        <div class="text-xs text-gray-600">Showing <span class="font-bold">{{ paginatorInfo.firstItem }}</span> to <span class="font-bold">{{ paginatorInfo.lastItem }}</span> of <span class="font-bold">{{ paginatorInfo.total }}</span> Entries</div>
        <div class="flex justify-between items-center mt-2">
            <div class="flex border border-gray-100">
                <div class="w-12 h-8 border border-gray-100 flex justify-center items-center cursor-pointer hover:text-purple-pink hover:bg-blue-50 text-xs text-gray-600" @click="goToPage(1)">First</div>
                <div :class="paginatorInfo.currentPage == page ? 'text-purple-pink bg-blue-50 font-medium' : ''" class="w-12 h-8 border border-gray-100 flex justify-center items-center cursor-pointer hover:text-purple-pink hover:bg-blue-50 text-xs text-gray-600" v-for="page in pages" :key="page" @click="goToPage(page)">{{ page }}</div>
                <div class="w-12 h-8 border border-gray-100 flex justify-center items-center cursor-pointer hover:text-purple-pink hover:bg-blue-50 text-xs text-gray-600" @click="goToPage(totalPages)">Last</div>
            </div>
            <div class="border-2 border-gray-100 flex">
                <div @click="previousPage" class="w-10 h-8 border-r border-gray-100 flex justify-center items-center cursor-pointer hover:bg-blue-50 group">
                    <icon-chevron-left class="h-5 w-5 text-gray-400 group-hover:text-purple-pink"></icon-chevron-left>
                </div>
                <div @click="nextPage" class="w-10 h-8 border-l border-gray-100 flex justify-center items-center cursor-pointer hover:bg-blue-50 group">
                    <icon-chevron-right class="h-5 w-5 text-gray-400 group-hover:text-purple-pink"></icon-chevron-right>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import IconChevronRight from '../icons/IconChevronRight.vue';
import IconChevronLeft from '../icons/IconChevronLeft.vue';
export default {
    name: "pagination",
    components: {
        IconChevronRight,
        IconChevronLeft,
    },
    props: {
        paginatorInfo: Object,
        setPage: Function,
    },
    computed: {
        page() {
            return this.paginatorInfo.currentPage;
        },
        totalPages() {
            return this.paginatorInfo.lastPage;
        },
        hasPreviousPage() {
            return this.paginatorInfo.currentPage > 1;
        },
        hasNextPage() {
            return this.paginatorInfo.hasMorePages;
        },
        pages() {
            const startPage = Math.max(this.page - 2, 1);
            const endPage = Math.min(startPage + 4, this.totalPages);
            const pages = [];
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            return pages;
        }
    },
    methods: {
        previousPage() {
            if (this.hasPreviousPage) {
                this.setPage(this.page - 1);
            }
        },
        nextPage() {
            if (this.hasNextPage) {
                this.setPage(this.page + 1);
            }
        },
        goToPage(page) {
            this.setPage(page);
        }
    }
};
</script>


<style lang="scss" scoped>

</style>
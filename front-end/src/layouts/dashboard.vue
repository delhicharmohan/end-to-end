<template>
  <div class="h-screen flex flex-col bg-gray-50 overflow-hidden">
    <div class="h-full flex flex-row flex-wrap">
      <div class="w-1/3 lg:w-1/5 h-full">
        <the-side-menu></the-side-menu>
      </div>
      <div class="h-full flex flex-col w-2/3 lg:w-4/5">
        <the-header></the-header>

        <div class="h-full overflow-y-hidden flex flex-col mt-28">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import TheSideMenu from "../components/layout/TheSideMenu.vue";
import TheHeader from "../components/layout/TheHeader.vue";
export default {
  name: "dashboard-layout",
  components: {
    TheSideMenu,
    TheHeader,
  },
};
</script>

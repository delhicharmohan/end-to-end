<template>
  <div
    class="min-h-screen w-full flex flex-col justify-center items-center overflow-y-auto bg-gray-50"
  >
    <slot></slot>
  </div>
</template>
<script>
export default {
  name: "blank-layout",
};
</script>

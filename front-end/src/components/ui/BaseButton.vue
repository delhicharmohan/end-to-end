<template>
  <button v-if="!link" :class="mode">
    <slot></slot>
  </button>
  <router-link v-else :to="to" :class="mode">
    <slot></slot>
  </router-link>
</template>

<script>
export default {
  props: {
    mode: {
      type: String,
      required: false,
      default: null,
    },
    link: {
      type: Boolean,
      required: false,
      default: false,
    },
    to: {
      type: String,
      required: false,
      default: "/",
    },
  },
};
</script>

<style lang="scss" scoped>
button,
a {
  @apply px-4 py-2 rounded-lg cursor-pointer text-white inline-block;
  text-decoration: none;
  font: inherit;
  background-color: #C62A2B;
  border: 1px solid #C62A2B;
}

a:hover,
a:active,
button:hover,
button:active {
  background-color: #270041;
  border-color: #270041;
}

.flat {
  background-color: transparent;
  color: #C62A2B;
  border: none;
}

.outline {
  @apply text-black border;
  background-color: transparent;
}

.flat:hover,
.flat:active,
.outline:hover,
.outline:active {
  // background-color: #edd2ff;
  @apply bg-gradient-to-r from-pink-500 to-purple-700 text-white;
}
</style>

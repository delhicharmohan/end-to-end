<template>
  <div>
    <div class="spinner-wrapper flex flex-col items-center">
      <div
        class="flex flex-wrap sm:flex-no-wrap justify-center sm:justify-start"
      >
        <h1
          class="font-semibold text-color-1 text-xl mr-1 text-center sm:text-left"
        >
          The transaction is processing
        </h1>
        <img
          class="h-8 sm:h-10"
          src="../../assets/images/loading-dots.gif"
          alt="..."
        />
      </div>
      <div class="spinner"></div>
    </div>
    <div class="overlay"></div>
  </div>
</template>

<script>
export default {
  name: "base-page-spinner",
};
</script>

<style lang="scss" scoped>
.spinner-wrapper {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
}

.spinner {
  border: 4px solid #ff0480;
  border-top: 4px solid #ff8e0a;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  animation: spin 1s linear infinite;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 9998;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.text-color-1 {
  color: #ff0480;
}
</style>

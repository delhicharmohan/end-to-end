<template>
  <section class="flex-auto p-4">
    <base-card class="h-full flex flex-col justify-center items-center">
      <h2 class="text-2xl font-bold text-red-600">You don't have permission to access this page!</h2>
      <p>
        Go to home page
        <router-link to="/"
          ><span class="underline cursor-pointer text-blue-700"
            >WIZPAY MASTER</span
          ></router-link
        >
      </p>
    </base-card>
  </section>
</template>

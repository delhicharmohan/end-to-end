<template>
    <div class="h-screen w-full flex flex-col bg-gray-100 items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#FFBF00"
                class="w-16 h-16 mx-auto amber">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 13l4 4L19 7"></path>
            </svg>
            <h1 class="text-2xl font-semibold amber mt-4 mb-2">Payment is pending!</h1>
            <p class="text-gray-600">Thank you for your purchase. Your payment is currently pending. We will notify you once it has been successfully processed.</p>
        </div>
    </div>
</template>

<script>
export default {
  name: "success",
}
</script>

<style>
.amber {
    color: #FFBF00;
}
</style>
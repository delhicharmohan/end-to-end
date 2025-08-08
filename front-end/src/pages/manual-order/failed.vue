<template>
    <div class="h-screen w-full flex flex-col bg-gray-100 items-center justify-center">
        <div class="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-red-600">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <h1 class="text-2xl font-semibold text-red-600 mt-4 mb-2">Payment Failed!</h1>
        </div>
    </div>
</template>

<script>
export default {
  name: "success",
}
</script>
// https://nuxt.com/docs/guide/directory-structure/error
// 共通エラーページ
<script setup lang="ts">
import type { NuxtError } from '#app'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps({
  error: Object as () => NuxtError,
})

const handleError = async () => {
  // Cookie削除
  await $fetch('/api/auth/logout');
  // Nuxt3エラークリア
  clearError({ redirect: '/login' });
};

</script>

<template>
  <div>
    <ul>
      <li>{{ error.statusCode }}</li>
      <li>{{ error.message }}</li>
    </ul><br>
    <input type="button" value="Login画面へ戻る" class="back_btn" @click="handleError">
  </div>
</template>

<style>
.back_btn {
  border: 0.5px solid black;
}
</style>

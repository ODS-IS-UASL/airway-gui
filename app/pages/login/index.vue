<template>
  <client-only>
  </client-only>
</template>
<script setup>
  const handleApiError = (error) => {
    if (error.response) {
      showError({
        statusCode: error.response.status,
        message: error.response.data.message || ''
      })
    } else {
      showError({
        statusCode: 500,
        message: 'Unknown error'
      })
    }
  }

  onMounted(async () => {
    localStorage.setItem('notificationBadge', String(''));
    localStorage.setItem('noticeDB', String(''));

    try {
      const config = useRuntimeConfig();
      const execAuth = config.public.ouranos.execAuth;
      if (execAuth) {        
        const response = await $fetch('/api/auth/login')
        console.log(response.uri)
        const uri = response.uri;
        if (uri) {
          // 未認証
          window.location.href = uri;
        } else {
          // 認証済み
          navigateTo('/login/selectRole');  
        }     
      } else {
        // 直接コールバック実行(テスト用)
        await $fetch('/api/auth/callback/keycloak?code=123')
        navigateTo('/login/selectRole')
      }
    } catch (error) {
      handleApiError(error)
    }
  });
</script>

/**
 * API 401 エラー発生時にセッション切れメッセージを表示し /login にリダイレクトする
 */
export default defineNuxtPlugin(() => {
  globalThis.$fetch = $fetch.create({
    onResponseError({ response }) {
      if (response.status === 401) {
        // auth 系エンドポイントは除外（ログイン・ログアウト処理中は無視）
        const url = String(response.url ?? '')
        if (url.includes('/api/auth/')) return

        window.alert('セッションが切れました。再度ログインしてください。')
        window.location.replace('/login')
      }
    },
  })
})

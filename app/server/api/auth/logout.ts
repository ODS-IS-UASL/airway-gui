export default eventHandler(async (event) => {
  console.log(`logout exetute.`);
  const config = useRuntimeConfig();
  const ACCESS_TOKEN_COOKIE = config.public.ouranos.cookie.accessToken;
  const REFRESH_TOKEN_COOKIE = config.public.ouranos.cookie.refreshToken;
  const EXPIRES_AT_COOKIE = config.public.ouranos.cookie.expiresAt;
  const ROLES_COOKIE = config.public.ouranos.cookie.roles;
  const OPERATOR_ID_COOKIE = config.public.ouranos.cookie.operatorId;
  const OPERATOR_NAME_COOKIE = config.public.ouranos.cookie.operatorName;
  const CODE_VERIFIRE_COOKIE = config.public.ouranos.cookie.codeVerifier;

  // Keycloak ログアウト API 呼び出し (IdP 側セッションを終了する)
  const keycloakLogoutUrl = config.keycloakLogoutUrl;
  const refreshToken = getCookie(event, REFRESH_TOKEN_COOKIE);
  if (keycloakLogoutUrl && refreshToken) {
    const clientId = config.ouranos.authFlow.clientId;
    const clientSecret = config.ouranos.authFlow.clientSecret;
    try {
      await $fetch(keycloakLogoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }).toString(),
      });
      console.log('Keycloak logout succeeded.');
    } catch (error) {
      // Keycloak 側のエラーはログに残すが、Cookie 削除は続行する
      console.error('Keycloak logout failed:', error);
    }
  } else {
    if (!keycloakLogoutUrl) console.warn('NUXT_KEYCLOAK_LOGOUT_URL が未設定のため、Keycloak ログアウトをスキップします。');
    if (!refreshToken) console.warn('リフレッシュトークンが存在しないため、Keycloak ログアウトをスキップします。');
  }

  const delCookieList = [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    EXPIRES_AT_COOKIE,
    ROLES_COOKIE,
    OPERATOR_ID_COOKIE,
    OPERATOR_NAME_COOKIE,
    CODE_VERIFIRE_COOKIE
  ]
  // クッキー削除
  for (const cookie of delCookieList) {
    deleteCookie(event, cookie, { path: '/' })
  }

  return { messsage: "logout successfully" };
});
import { refreshAccessToken } from '~/server/utils/ouranos';
import { defineEventHandler } from 'h3'

// リフレッシュ処理を管理するオブジェクト
const refreshPromises = {};

export default defineEventHandler(async (event) => {

  // 認証不要ページ
  const EXCLUDE_PATHS = [
    '/api/auth/login',     // ログインURL取得
    '/api/auth/callback/keycloak',  // 認可コード受け取り
    '/api/auth/logout',    // ログアウト
  ]

  const { pathname } = getRequestURL(event)

  if (!pathname.startsWith('/api/')) {
    // console.log(`No Auth: ${pathname}`)
    return;
  }

  // 前方一致で除外
  if (EXCLUDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // console.log(`No Auth: ${pathname}`)
    return
  }

  // console.log(`Auth: ${pathname}`)
  const ACCESS_TOKEN_COOKIE = useRuntimeConfig().public.ouranos.cookie.accessToken;
  const EXPIRES_AT_COOKIE = useRuntimeConfig().public.ouranos.cookie.expiresAt;
  const accessToken = getCookie(event, ACCESS_TOKEN_COOKIE)
  const expiresAt = getCookie(event, EXPIRES_AT_COOKIE)
  if (accessToken && expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    if (now > Number(expiresAt)) {
      // アクセストークンの有効期限が切れている
      console.log("expired access token. try refresh.")
      try {
        await updateToken(event);
      } catch (error) {
        throw error;
      }
    } else {
      // console.log("token no update")
    }
  } else {
    // アクセストークンが Cookie から消えている
    console.log("no access token. try refresh.")
    try {
      await updateToken(event);
    } catch (error) {
      throw error;
    }
  }
})

const updateToken = async (event) => {
  const REFRESH_TOKEN_COOKIE = useRuntimeConfig().public.ouranos.cookie.refreshToken;
  const refreshToken = getCookie(event, REFRESH_TOKEN_COOKIE);
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  // ユーザー識別キー(operatorId)
  const OPERATOR_ID_COOKIE = useRuntimeConfig().public.ouranos.cookie.operatorId;
  const operatorId = getCookie(event, OPERATOR_ID_COOKIE);
  const userKey = operatorId;
  try {
    // 既に実行中のリフレッシュ処理があれば、それを待つ
    if (refreshPromises[userKey]) {
      // console.log(`refresh token wait: ${userKey}`);
    } else {
      // 新しいリフレッシュ処理を開始
      // console.log(`refresh token start: ${userKey}`);
      refreshPromises[userKey] = refreshAccessToken(refreshToken)
        .finally(() => {
          delete refreshPromises[userKey];
        });
    }
    const newTokens = await refreshPromises[userKey];
    setCookies(
      event, 
      newTokens.accessToken, 
      newTokens.expiresIn, 
      newTokens.refreshToken,
      newTokens.refreshExpiresIn,
    );
    console.log('update token success.');
  } catch (error) {
    console.log("update token failed.")
    throw error;
  }
}

// Cookie のセット
const setCookies = (event, accessToken, expiresIn, refreshToken, refreshExpiresIn) => {
  const config = useRuntimeConfig();
  const ACCESS_TOKEN_COOKIE = config.public.ouranos.cookie.accessToken;
  const EXPIRES_AT_COOKIE = config.public.ouranos.cookie.expiresAt;
  const REFRESH_TOKEN_COOKIE = config.public.ouranos.cookie.refreshToken;
  const REFRESH_EXPIRES_AT_COOKIE = config.public.ouranos.cookie.refreshExpiresAt;
  const secureFlg = config.public.ouranos.cookie.secureFlg;
  const skewSeconds = config.public.ouranos.cookie.skewSeconds; // 時計ずれ・通信遅延を考慮しスキューを設定
  const expiresInMaxAge = Math.max(0, expiresIn - skewSeconds)
  const refreshExpiresInMaxAge = Math.max(0, refreshExpiresIn - skewSeconds)
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMaxAge;
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + refreshExpiresInMaxAge;
  // アクセストークンの Cookie オプション
  const accessCookieOptions = {
    httpOnly: true,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresInMaxAge,
  }
  // リフレッシュトークントークンの Cookie オプション
  const refreshCookieOptions = {
    httpOnly: true,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshExpiresInMaxAge,
  }
  // 見えても問題ない Cookie オプション
  const otheCookieOptions = {
    httpOnly: false,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
  }

  // アクセストークン
  setCookie(event, ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions)
  // アクセストークン期限(UNIX秒)は見えても問題ない値
  setCookie(event, EXPIRES_AT_COOKIE, expiresAt.toString(), otheCookieOptions)
  // リフレッシュトークン
  setCookie(event, REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions)
  // リフレッシュトークン期限(UNIX秒)は見えても問題ない値
  setCookie(event, REFRESH_EXPIRES_AT_COOKIE, refreshExpiresAt.toString(), otheCookieOptions)
}
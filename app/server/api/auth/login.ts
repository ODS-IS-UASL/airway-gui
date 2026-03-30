import { getLoginUrl } from '~/server/utils/ouranos';
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const ACCESS_TOKEN_COOKIE = config.public.ouranos.cookie.accessToken;
  const EXPIRES_AT_COOKIE = config.public.ouranos.cookie.expiresAt;
  const CODE_VERIFIRE_COOKIE = config.public.ouranos.cookie.codeVerifier;
  const secureFlg = config.public.ouranos.cookie.secureFlg;

  const accessToken = getCookie(event, ACCESS_TOKEN_COOKIE);
  const expiresAt = getCookie(event, EXPIRES_AT_COOKIE)
  let response;
  if (accessToken && expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    if (now < Number(expiresAt)) {
      // アクセストークンの有効期限が切れていない
      return {
        uri: ""
      };
    }
  }
  // アクセストークンが Cookie にない、または、アクセストークンが無効の場合にログインURLを取得
  try {
    response = await getLoginUrl();
  } catch (error) {
    throw error;
  }
  
  // token 交換に必要なのでサーバ側で保持
  // 見られても問題ない値のため httponly は false
  setCookie(event, CODE_VERIFIRE_COOKIE, response.codeVerifier, {
    httpOnly: false,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })
  return {
    uri: response.loginUrl
  };
})
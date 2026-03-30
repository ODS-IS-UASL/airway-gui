import { defineEventHandler } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'
import { getUserAccessToken, verifyAccessToken, getClientSystemToken, getUserAttr } from '~/server/utils/ouranos';


export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const execAuth = config.public.ouranos.execAuth;
  const CODE_VERIFIRE_COOKIE = config.public.ouranos.cookie.codeVerifier;
  let response;
  const codeVerifier = getCookie(event, CODE_VERIFIRE_COOKIE)
  const { code } = getQuery(event) as { code?: string; }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'missing code' })
  }
  // ユーザ当人認証(認可コードフロー)_トークン取得API
  // Cookie にアクセストークン・リフレッシュトークンを保存
  try {
    response = await getUserAccessToken(code, codeVerifier);
  } catch (error) {
    throw error;
  }
  const accessToken = response.accessToken;
  const expiresIn = response.expiresIn;
  const refreshToken = response.refreshToken;
  const refreshExpiresIn = response.refreshExpiresIn;
  deleteCookie(event, CODE_VERIFIRE_COOKIE, { path: '/' })

  // トークンイントロスペクションAPI
  // トークンの検証、Cookie に登録しているアクセストークンから operatorId を取得
  try {
    response = await verifyAccessToken(accessToken);
  } catch (error) {
    throw error;
  }
  if (!response.data.active) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const operatorId = response.data.operatorId;

  // クライアントシステム認証API
  // ユーザ属性取得APIを実行するためのアクセストークンを取得
  try {
    response = await getClientSystemToken();
  } catch (error) {
    throw error;
  }
  const clientAccessToken = response.accessToken;

  // ユーザ属性取得API
  // ロールを取得
  try {
    response = await getUserAttr(clientAccessToken, operatorId);
  } catch (error) {
    throw error;
  }
  const roles = response.roles;
  const operatorName = response.operatorName;
  const parentOperatorId = response.parentOperatorId;

  setCookies(
    event, 
    accessToken, 
    expiresIn, 
    refreshToken, 
    refreshExpiresIn,
    roles,
    operatorId,
    parentOperatorId,
    operatorName
  )

  if (execAuth) { 
    return sendRedirect(event, '/login/selectRole', 302);
  } else {
    return;
  }
})

// Cookie のセット
const setCookies = (
  event, 
  accessToken, 
  expiresIn, 
  refreshToken, 
  refreshExpiresIn, 
  roles,
  operatorId,
  parentOperatorId,
  operatorName
  ) => {
  const config = useRuntimeConfig();
  const ACCESS_TOKEN_COOKIE = config.public.ouranos.cookie.accessToken;
  const EXPIRES_AT_COOKIE = config.public.ouranos.cookie.expiresAt;
  const REFRESH_TOKEN_COOKIE = config.public.ouranos.cookie.refreshToken;
  const REFRESH_EXPIRES_AT_COOKIE = config.public.ouranos.cookie.refreshExpiresAt;
  const ROLES_COOKIE = config.public.ouranos.cookie.roles;
  const OPERATOR_ID_COOKIE = config.public.ouranos.cookie.operatorId;
  const PARENT_OPERATOR_ID_COOKIE = config.public.ouranos.cookie.parentOperatorId;
  const OPERATOR_NAME_COOKIE = config.public.ouranos.cookie.operatorName;
  const secureFlg = config.public.ouranos.cookie.secureFlg;
  const skewSeconds = config.public.ouranos.cookie.skewSeconds; // 時計ずれ・通信遅延を考慮しスキューを設定
  const expiresInMaxAge = Math.max(0, expiresIn - skewSeconds);
  const refreshExpiresInMaxAge = Math.max(0, refreshExpiresIn - skewSeconds);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMaxAge;
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + refreshExpiresInMaxAge;
  // アクセストークンの Cookie オプション
  const accessCookieOptions: CookieSerializeOptions = {
    httpOnly: true,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresInMaxAge,
  }
  // リフレッシュトークントークンの Cookie オプション
  const refreshCookieOptions: CookieSerializeOptions = {
    httpOnly: true,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshExpiresInMaxAge,
  }
  // 見えても問題ない Cookie オプション
  const otheCookieOptions: CookieSerializeOptions = {
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
  // roles は見えても問題ない値
  setCookie(event, ROLES_COOKIE, JSON.stringify(roles), otheCookieOptions)
  // operatorId は見えても問題ない値
  setCookie(event, OPERATOR_ID_COOKIE, operatorId, otheCookieOptions)
  // parentOperatorId は見えても問題ない値
  setCookie(event, PARENT_OPERATOR_ID_COOKIE, parentOperatorId, otheCookieOptions)
  // operatorName は見えても問題ない値
  setCookie(event, OPERATOR_NAME_COOKIE, operatorName, otheCookieOptions)
}

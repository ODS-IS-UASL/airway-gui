import type { CookieSerializeOptions } from 'cookie-es'
import { defineEventHandler } from 'h3'
import { refreshAccessToken } from '~/server/utils/ouranos'

/**
 * アクセストークン更新エンドポイント（クライアント主導）
 * ブラウザの operation_history ロジックで呼び出される。
 * httpOnly Cookie の refresh_token を使ってアクセストークンを更新する。
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const REFRESH_TOKEN_COOKIE = config.public.ouranos.cookie.refreshToken

  const refreshToken = getCookie(event, REFRESH_TOKEN_COOKIE)
  if (!refreshToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  let newTokens: Awaited<ReturnType<typeof refreshAccessToken>>
  try {
    newTokens = await refreshAccessToken(refreshToken)
  }
  catch {
    throw createError({ statusCode: 401, statusMessage: 'Token refresh failed' })
  }

  const ACCESS_TOKEN_COOKIE = config.public.ouranos.cookie.accessToken
  const EXPIRES_AT_COOKIE = config.public.ouranos.cookie.expiresAt
  const REFRESH_EXPIRES_AT_COOKIE = config.public.ouranos.cookie.refreshExpiresAt
  const secureFlg = config.public.ouranos.cookie.secureFlg
  const skewSeconds = config.public.ouranos.cookie.skewSeconds

  const expiresInMaxAge = Math.max(0, newTokens.expiresIn - skewSeconds)
  const refreshExpiresInMaxAge = Math.max(0, newTokens.refreshExpiresIn - skewSeconds)
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMaxAge
  const refreshExpiresAt = Math.floor(Date.now() / 1000) + refreshExpiresInMaxAge

  const accessCookieOptions: CookieSerializeOptions = {
    httpOnly: true,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresInMaxAge,
  }

  const refreshCookieOptions: CookieSerializeOptions = {
    httpOnly: true,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshExpiresInMaxAge,
  }

  const otherCookieOptions: CookieSerializeOptions = {
    httpOnly: false,
    secure: secureFlg,
    sameSite: 'lax',
    path: '/',
  }

  // アクセストークン
  setCookie(event, ACCESS_TOKEN_COOKIE, newTokens.accessToken, accessCookieOptions)
  // アクセストークン期限(UNIX秒)
  setCookie(event, EXPIRES_AT_COOKIE, expiresAt.toString(), otherCookieOptions)
  // リフレッシュトークン
  setCookie(event, REFRESH_TOKEN_COOKIE, newTokens.refreshToken, refreshCookieOptions)
  // リフレッシュトークン期限(UNIX秒)
  setCookie(event, REFRESH_EXPIRES_AT_COOKIE, refreshExpiresAt.toString(), otherCookieOptions)

  return { success: true }
})

import { jwtDecode } from "jwt-decode";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const clientId = config.public.oidcClientId;
  const issuer = config.oidcIssuerDev;
  let response = {};
  const body = await readBody(event);
  // トークン取得
  try {
    response = await getDipsToken(body.code);
  } catch (error) {
    console.log("getDipsToken failed.", error);
    if (error?.response?.status === 400) {
      throw createError({ statusCode: 400, statusMessage: 'Id token invalid or not exist.' })
    } else {
      throw createError({ statusCode: 500, statusMessage: 'get token error.' })
    }
  }
  if (response?.id_token) {
    const isVerify = verifyIdToken(response.id_token, issuer, clientId);
    if (!isVerify) {
      throw createError({ statusCode: 400, statusMessage: 'Id token invalid or not exist.' });
    }
  } else {
    console.error('Id token not exist.');
    throw createError({ statusCode: 400, statusMessage: 'Id token invalid or not exist.' });  
  }
    
  // 外部連携登録
  const regTokenParams = {
    "clientId": clientId,
    "accessToken": response.access_token,
    "expiresIn": response.expires_in,
    "refreshExpiresIn": response.refresh_expires_in,
    "refreshToken": response.refresh_token,
    "tokenType": response.token_type,
    "idToken": response.id_token,
    "notBeforePolicy": response["not-before-policy"],
    "sessionState": response.session_state,
    "scope": response.scope
  };
  // 外部連携へアクセストークン等を保存
  const client = createMiscApiClient(event);
  const res = await client.put(`/dipsToken`, regTokenParams);
  return res;
});

// ID トークン検証
function verifyIdToken(idToken, issuer, clientId) {
  try {
  const decIdToken = jwtDecode(idToken);
  // console.log(decIdToken);
  // iss クレーム確認
  if (decIdToken.iss === issuer) {
    // ID トークンの発行者が異なる場合は不正
    console.log("invalid iss(" + decIdToken.iss + ")");
    return false;
  }
  // aud クレーム確認
  if (decIdToken.aud !== clientId) {
    // クライアントIDと一致しない場合は不正
    console.log("invalid aud(" + decIdToken.aud + ")");
    return false;
  }
  // exp クレーム確認
  console.log("getCurrentUnixTime() : " + getCurrentUnixTime());
  if (decIdToken.exp < getCurrentUnixTime()) {
    // 現在時刻より前の場合は不正
    console.log("invalid exp(" + decIdToken.exp + ")");
    return false;
  }
  console.log("verifyIdToken() success.");
  return true;
  } catch (error) {
    console.log("verifyIdToken() error", error)
    return false;
  }
}

// Unix 時間取得(秒)
function getCurrentUnixTime() {
  // 現在の時刻をミリ秒単位で取得
  const currentTimeMillis = Date.now();
  
  // ミリ秒から秒に変換
  return Math.floor(currentTimeMillis / 1000);
}
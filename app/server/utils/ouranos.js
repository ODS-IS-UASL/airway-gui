import crypto from 'node:crypto'

function generateCodeVerifier(length = 128) {
  // URL繧ｻ繝ｼ繝輔↑譁・ｭ励そ繝・ヨ
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  
  // 繝ｩ繝ｳ繝繝縺ｪ譁・ｭ怜・繧堤函謌・
  const bytes = crypto.randomBytes(length)
  
  let codeVerifier = '';
  for (let i = 0; i < length; i++) {
    // 荵ｱ謨ｰ繧呈枚蟄励そ繝・ヨ縺ｮ繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｫ螟画鋤
    codeVerifier += charset[bytes[i] % charset.length];
  }
  
  return codeVerifier;
}

async function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest()
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 繝ｭ繧ｰ繧､繝ｳURL蜿門ｾ・
export const getLoginUrl = async () => {
  const config = useRuntimeConfig();
  const redirectUri = config.ouranos.redirectUri;
  const authFlowClientId = config.ouranos.authFlow.clientId;
  const apiBaseUrl = config.ouranos.apiBaseUrl;
  const apiKey = config.ouranos.apiKey;

  let response = {};
  // PKCE逕ｨ繧ｳ繝ｼ繝峨メ繝｣繝ｬ繝ｳ繧ｸ逕滓・
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // header
  const headers = {
    'API-Key': apiKey,
    'Content-Type': 'application/json',
  }
  // param
  const params = {
    client_id: authFlowClientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
  }

  const url = `${apiBaseUrl}/auth/url`
  try {
    response = await $fetch(url, {
      method: 'POST',
      headers: headers,
      body: params,
    })
    return {
      codeVerifier: codeVerifier,
      loginUrl: response.data.url
    }
  } catch (error) {
    console.error('Failed to getLoginUrl.', error);
    const statusCode = error?.statusCode ?? 0
    const message = error?.statusMessage ?? error?.message ?? 'Request failed'
    throw createError({
      statusCode: statusCode,
      statusMessage: message,
    })
  }
}

// 繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ蜿門ｾ・
export const getUserAccessToken = async (code, codeVerifier) => {
  const config = useRuntimeConfig();
  const redirectUri = config.ouranos.redirectUri;
  const authFlowClientId = config.ouranos.authFlow.clientId;
  const apiBaseUrl = config.ouranos.apiBaseUrl;
  const apiKey = config.ouranos.apiKey;
  const authFlowClientSecret = config.ouranos.authFlow.clientSecret;

  let response = {};
  // header
  const headers = {
    'API-Key': apiKey,
    'Content-Type': 'application/json',
  }
  // param
  const params = {
    code: code,
    client_id: authFlowClientId,
    client_secret: authFlowClientSecret,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  }
  const url = `${apiBaseUrl}/auth/token`
  try {
    response = await $fetch(url, {
      method: 'POST',
      headers: headers,
      body: params,
    })
    // 繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ
    const accessToken = response.data.access_token
    const expiresIn = response.data.expires_in // 遘・
    // 繝ｪ繝輔Ξ繝・す繝･繝医・繧ｯ繝ｳ
    const refreshToken = response.data.refresh_token
    const refreshExpiresIn = response.data.refresh_expires_in
    return {
      accessToken: accessToken,
      expiresIn: expiresIn,
      refreshToken: refreshToken,
      refreshExpiresIn: refreshExpiresIn,
    }
  } catch (error) {
    console.error('Failed to getUserAccessToken().', error);
    const statusCode = error?.statusCode ?? 0
    const message = error?.statusMessage ?? error?.message ?? 'Request failed'
    throw createError({
      statusCode: statusCode,
      statusMessage: message,
    })
  }
};

// 繝医・繧ｯ繝ｳ讀懆ｨｼ
export const verifyAccessToken = async (accessToken) => {
  const config = useRuntimeConfig();
  const authFlowClientId = config.ouranos.authFlow.clientId;
  const apiBaseUrl = config.ouranos.apiBaseUrl;
  const apiKey = config.ouranos.apiKey;
  const authFlowClientSecret = config.ouranos.authFlow.clientSecret;

  let response = {};
  // header
  const headers = {
    'API-Key': apiKey,
    'Content-Type': 'application/json',
  }
  // param
  if (!accessToken) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const params = {
    "client_id": authFlowClientId,
    "client_secret": authFlowClientSecret,
    "access_token": accessToken
  }
  const url = `${apiBaseUrl}/auth/token/introspect`
  try {
    response = await $fetch(url, {
      method: 'POST',
      headers: headers,
      body: params,
    })
    let data = {};
    if (response.status === 200) {
      const tokenInfo = response.data.token_info;
      if (response.data.active) {
        data = {
          active: true,
          operatorId: tokenInfo.operator_id,
          // exp: tokenInfo.exp,
        }
      } else {
        data = {
          active: false,
        }
      }
    } else {
    }
    return {
      data: data
    }
  } catch (error) {
    console.error("Failed to verifyAccessToken().");
    const statusCode = error?.statusCode ?? 0
    const message = error?.statusMessage ?? error?.message ?? 'Request failed'
    throw createError({
      statusCode: statusCode,
      statusMessage: message,
    })
  }
};

// 繝ｦ繝ｼ繧ｶ螻樊ｧ蜿門ｾ礼畑縺ｮ繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ蜿門ｾ・
export const getClientSystemToken = async () => {
  const config = useRuntimeConfig();
  const clientFlowClientId = config.ouranos.clientFlow.clientId;
  const apiBaseUrl = config.ouranos.apiBaseUrl;
  const apiKey = config.ouranos.apiKey;
  const clientFlowClientSecret = config.ouranos.clientFlow.clientSecret;

  // header
  const headers = {
    'API-Key': apiKey,
    'Content-Type': 'application/json',
  }
  // param
  const params = {
    "client_id": clientFlowClientId,
    "client_secret": clientFlowClientSecret
  }
  const url = `${apiBaseUrl}/auth/token/client`
  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers: headers,
      body: params,
    })
    // 繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ
    const accessToken = response.data.access_token
    const expiresIn = response.data.expires_in // 遘・
    return {
      accessToken: accessToken,
      expiresIn: expiresIn
    }
  } catch (error) {
    console.error('Failed to getClientSystemToken.', error);
    const statusCode = error?.statusCode ?? 0
    const message = error?.statusMessage ?? error?.message ?? 'Request failed'
    throw createError({
      statusCode: statusCode,
      statusMessage: message,
    })
  }
}

// 繝ｦ繝ｼ繧ｶ螻樊ｧ蜿門ｾ・
export const getUserAttr = async (accessToken, operatorId) => {
  const config = useRuntimeConfig();
  const userAttrUrl = config.ouranos.userAttrUrl;
  const apiKey = config.ouranos.apiKey;
  let response = {};
  // header
  const headers = {
    'Content-Type': 'application/json',
    'API-Key': apiKey,
    'Authorization': `Bearer ${accessToken}`,
  }
  // param
  let params = {
    userIdList: [operatorId]
  }
  const url = `${userAttrUrl}/user/api/v1/user_attr`
  try {
    let parentOperatorId;
    // 繝ｦ繝ｼ繧ｶ(蟄・縺ｮ繝ｭ繝ｼ繝ｫ遒ｺ隱・
    response = await $fetch(url, {
      method: 'POST',
      headers: headers,
      body: params,
    })
    const userRoles = response.attributeList[0].attribute.roles.map(role => role.roleId);
    const operatorName = response.attributeList[0].operator_name;
    const childOperatorId = response.attributeList[0].attribute.operatorId;
    const roles = userRoles;
    if (!childOperatorId) {
      // childOperatorId 縺・null 縺ｮ蝣ｴ蜷医∽ｺ区･ｭ閠・〒繝ｭ繧ｰ繧､繝ｳ
      parentOperatorId = operatorId
    } else {
      // childOperatorId 縺・null 縺ｧ縺ｪ縺・ｴ蜷医√Θ繝ｼ繧ｶ縺ｧ繝ｭ繧ｰ繧､繝ｳ
      // 莠区･ｭ閠・隕ｪ)縺ｮ繝ｭ繝ｼ繝ｫ遒ｺ隱・
      parentOperatorId = response.attributeList[0].attribute.operatorId // 莠区･ｭ閠・D
      params = {
        userIdList: [parentOperatorId]
      }
      response = await $fetch(url, {
        method: 'POST',
        headers: headers,
        body: params,
      })
      const parentOperatorRoles = response.attributeList[0].attribute.roles.map(role => role.roleId);
      if (parentOperatorRoles.length !== 0 && parentOperatorRoles.includes("3")) {
        // 莠区･ｭ閠・隕ｪ)縺ｮ繝ｭ繝ｼ繝ｫ縺ｫ髢｢菫り・′蜈･縺｣縺ｦ縺・ｋ蝣ｴ蜷医・繝ｦ繝ｼ繧ｶ(蟄・縺ｮ繝ｭ繝ｼ繝ｫ縺ｫ霑ｽ蜉
        roles.push("3");
      }
    }
    return {
      roles: roles,
      operatorName: operatorName,
      parentOperatorId: parentOperatorId,
    }
  } catch (error) {
    console.error('Failed to getUserAttr.', error);
    const statusCode = error?.statusCode ?? 0
    const message = error?.statusMessage ?? error?.message ?? 'Request failed'
    throw createError({
      statusCode: statusCode,
      statusMessage: message,
    })
  }
}

// 繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ譖ｴ譁ｰ
export const refreshAccessToken = async (refreshToken) => {
  const config = useRuntimeConfig();
  const authFlowClientId = config.ouranos.authFlow.clientId;
  const apiBaseUrl = config.ouranos.apiBaseUrl;
  const apiKey = config.ouranos.apiKey;
  const authFlowClientSecret = config.ouranos.authFlow.clientSecret;
  // header
  const headers = {
    'API-Key': apiKey,
    'Content-Type': 'application/json',
  }
  // param
  const params = {
    "client_id": authFlowClientId,
    "client_secret": authFlowClientSecret,
    "refresh_token": refreshToken
  }
  const url = `${apiBaseUrl}/auth/token/refresh`
  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers: headers,
      body: params,
    })
    const accessToken = response.data.access_token
    const expiresIn = response.data.expires_in
    const refreshToken = response.data.refresh_token
    const refreshExpiresIn = response.data.refresh_expires_in
    return {
      accessToken: accessToken,
      expiresIn: expiresIn,
      refreshToken: refreshToken,
      refreshExpiresIn: refreshExpiresIn
    }
  } catch (error) {
    console.error('Failed to refreshAccessToken.', error);
    const statusCode = error?.statusCode ?? 0
    const message = error?.statusMessage ?? error?.message ?? 'Request failed'
    throw createError({
      statusCode: statusCode,
      statusMessage: message,
    })
  }
}


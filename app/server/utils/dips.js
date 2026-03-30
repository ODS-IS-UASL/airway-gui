export const getDipsToken = async (code) => {

  console.log(`code : ` + code);

  const config = useRuntimeConfig();
  const redirectUri = config.public.oidcRedirectUri;
  const clientId = config.public.oidcClientId;
  const clientSecret = config.oidcClientSecret;
  const grantType = config.oidcGrantType;
  const tokenEndPoint = config.oidcTokenEndPointDev;

  const params = new URLSearchParams({ 
    grant_type: grantType,
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
  const res = await $fetch(tokenEndPoint, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
  })

  return res;
  } catch (error) {
    throw error
  }
};
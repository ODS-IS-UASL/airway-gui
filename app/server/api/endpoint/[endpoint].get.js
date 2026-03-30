export default defineEventHandler(async (event) => {
  const ACCESS_TOKEN_COOKIE = useRuntimeConfig().public.ouranos.cookie.accessToken;
  const accessToken = getCookie(event, ACCESS_TOKEN_COOKIE);
  const query = getQuery(event)
  const encodeEndpoint = getRouterParam(event, 'endpoint')
  const headers = { Authorization: `Bearer ${accessToken}` }
  const decodeEndpoint = decodeURIComponent(encodeEndpoint)

  const res = await $fetch.raw(decodeEndpoint, {
    method: 'GET',
    headers: headers,
    query: query,
    ignoreResponseError: true,
  })

  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    data: res._data,
  }
});
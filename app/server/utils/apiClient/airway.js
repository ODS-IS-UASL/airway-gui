export const createAirwayApiClient = (event) => {
  const baseURL = useRuntimeConfig().airwayApiBaseUrl;
  const ACCESS_TOKEN_COOKIE = useRuntimeConfig().public.ouranos.cookie.accessToken;
  const accessToken = getCookie(event, ACCESS_TOKEN_COOKIE);
  const api = $fetch.create({
    baseURL,
    ignoreResponseError: true,
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    // onRequest({ request, options }) {
    //   const h = options.headers
    //   const headersObj =
    //     h instanceof Headers ? Object.fromEntries(h.entries()) : { ...(h || {}) }
    //   if (headersObj.Authorization) headersObj.Authorization = "***"

    //   console.log("[fetch request]", request, headersObj)
    // },

    // onResponse({ request, response }) {
    //   console.log("[fetch response]", request, response.status)
    // },
  })

  const request = async (method, path, opts = {}) => {
    const res = await api.raw(path, { method, ...opts })
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res._data }
  }

  return {
    get: (path, opts) => request("GET", path, opts),
    post: (path, body, opts = {}) => request("POST", path, { ...opts, body }),
    // put: (path, body, opts = {}) => request("PUT", path, { ...opts, body }),
    patch: (path, body, opts = {}) => request("PATCH", path, { ...opts, body }),
    del: (path, opts) => request("DELETE", path, opts),
  }
}
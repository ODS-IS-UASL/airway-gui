export default defineEventHandler(async (event) => {
  const baseURL = useRuntimeConfig().public.apiBaseUrl;
  const ACCESS_TOKEN_COOKIE = useRuntimeConfig().public.ouranos.cookie.accessToken;
  const accessToken = getCookie(event, ACCESS_TOKEN_COOKIE);
  const aircraftId = getRouterParam(event, 'aircraftId');
  const fileId = getRouterParam(event, 'fileId');
  const res = await fetch(`${baseURL}/aircraft/info/detail/${aircraftId}/${fileId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    setResponseStatus(event, res.status)
    return await res.text()
  }

  // 外部APIのレスポンスヘッダをクライアントへ引き継ぐ
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const contentDisposition = res.headers.get('content-disposition') || 'attachment'
  const contentLength = res.headers.get('content-length')

  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Content-Disposition', contentDisposition)
  if (contentLength) headers.set('Content-Length', contentLength)

  return new Response(res.body, {
    status: 200,
    headers,
  })
});
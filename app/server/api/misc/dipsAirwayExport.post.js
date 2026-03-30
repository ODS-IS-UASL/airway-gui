export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const baseURL = useRuntimeConfig().miscApiBaseUrl;
  const ACCESS_TOKEN_COOKIE = useRuntimeConfig().public.ouranos.cookie.accessToken;
  const accessToken = getCookie(event, ACCESS_TOKEN_COOKIE);
  const res = await fetch(`${baseURL}/dipsAirwayExport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/octet-stream, application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    console.log("Failed to dips export zip: ", res)
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
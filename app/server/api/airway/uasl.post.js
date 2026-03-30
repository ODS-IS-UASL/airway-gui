export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createAirwayApiClient(event);
  const res = client.post(`/uasl`, body);
  return res;
});
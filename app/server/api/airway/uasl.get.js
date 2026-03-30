export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createAirwayApiClient(event);
  const res = client.get(`/uasl`, { query });
  return res;
});
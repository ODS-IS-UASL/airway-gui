export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createAirwayApiClient(event);
  const res = client.get(`/max-fall-range`, { query });
  return res;
});
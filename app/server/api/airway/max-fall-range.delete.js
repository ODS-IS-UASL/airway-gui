export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createAirwayApiClient(event);
  const res = client.del(`/max-fall-range`, { query });
  return res;
});
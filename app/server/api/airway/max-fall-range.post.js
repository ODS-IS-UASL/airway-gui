export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createAirwayApiClient(event);
  const res = client.post(`/max-fall-range`, body);
  return res;
});
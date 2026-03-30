export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createAirwayApiClient(event);
  const res = client.post(`/feasible-vol-seam`, body);
  return res;
});
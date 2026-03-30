export default defineEventHandler(async (event) => {
  const client = createAirwayApiClient(event);
  const res = client.get(`/aircraft`);
  return res;
});
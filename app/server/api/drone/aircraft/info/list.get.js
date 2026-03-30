export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createDroneApiClient(event);
  const res = client.get(`/aircraft/info/list`, { query });
  return res;
});
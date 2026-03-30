export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createDroneApiClient(event);
  const res = client.put(`/aircraft/info`, body);
  return res;
});
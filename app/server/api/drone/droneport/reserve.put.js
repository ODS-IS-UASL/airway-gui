export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createDroneApiClient(event);
  const res = client.put(`/droneport/reserve`, body);
  return res;
});
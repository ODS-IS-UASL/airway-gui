export default defineEventHandler(async (event) => {
  const reserveId = getRouterParam(event, 'reserveId');
  const body = await readBody(event);
  const client = createDroneApiClient(event);
  const res = client.del(`/aircraft/reserve/${reserveId}`, body);
  return res;
});
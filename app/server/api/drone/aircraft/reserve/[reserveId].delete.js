export default defineEventHandler(async (event) => {
  const reserveId = getRouterParam(event, 'reserveId');
  const query = getQuery(event);
  const client = createDroneApiClient(event);
  const res = client.del(`/aircraft/reserve/${reserveId}`, query);
  return res;
});
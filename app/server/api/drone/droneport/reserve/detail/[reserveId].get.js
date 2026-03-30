export default defineEventHandler(async (event) => {
  const reserveId = getRouterParam(event, 'reserveId');
  const client = createDroneApiClient(event);
  const res = client.get(`/droneport/reserve/detail/${reserveId}`);
  return res;
});
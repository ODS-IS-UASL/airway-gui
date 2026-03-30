export default defineEventHandler(async (event) => {
  const dronePortId = getRouterParam(event, 'dronePortId');
  const query = getQuery(event);
  const client = createDroneApiClient(event);
  const res = client.get(`/droneport/info/detail/${dronePortId}`, { query });
  return res;
});
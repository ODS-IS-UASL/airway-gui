export default defineEventHandler(async (event) => {
  const dronePortId = getRouterParam(event, 'dronePortId');
  const client = createDroneApiClient(event);
  const res = client.get(`/droneport/environment/${dronePortId}`);
  return res;
});
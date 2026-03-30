export default defineEventHandler(async (event) => {
  const dronePortId = getRouterParam(event, 'dronePortId');
  const body = await readBody(event);
  const client = createDroneApiClient(event);
  const res = client.del(`/droneport/info/${dronePortId}`, body);
  return res;
});
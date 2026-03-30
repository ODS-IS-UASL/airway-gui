export default defineEventHandler(async (event) => {
  const aircraftId = getRouterParam(event, 'aircraftId');
  const body = await readBody(event);
  const client = createDroneApiClient(event);
  const res = client.del(`/aircraft/info/${aircraftId}`, body);
  return res;
});
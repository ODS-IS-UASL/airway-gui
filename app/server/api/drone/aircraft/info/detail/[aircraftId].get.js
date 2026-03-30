export default defineEventHandler(async (event) => {
  const aircraftId = getRouterParam(event, 'aircraftId');
  const query = getQuery(event);
  const client = createDroneApiClient(event);
  const res = client.get(`/aircraft/info/detail/${aircraftId}`, { query });
  return res;
});
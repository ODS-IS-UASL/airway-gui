export default defineEventHandler(async (event) => {
  const uaslId = getRouterParam(event, 'uaslId');
  const client = createAirwayApiClient(event);
  const res = client.del(`/uasl/${uaslId}`);
  return res;
});
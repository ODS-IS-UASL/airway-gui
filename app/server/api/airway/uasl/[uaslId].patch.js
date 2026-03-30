export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const uaslId = getRouterParam(event, 'uaslId');
  const client = createAirwayApiClient(event);
  const res = client.patch(`/uasl/${uaslId}`, body);
  return res;
});
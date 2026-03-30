export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createMiscApiClient(event);
  const res = client.post(`/flightProhibitedAreaReceiver`, body);
  return res;
});
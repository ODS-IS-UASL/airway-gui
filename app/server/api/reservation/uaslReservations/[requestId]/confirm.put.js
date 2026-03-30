export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'requestId');
  const client = createReservationApiClient(event);
  const res = client.put(`/uaslReservations/${requestId}/confirm`);
  return res;
});
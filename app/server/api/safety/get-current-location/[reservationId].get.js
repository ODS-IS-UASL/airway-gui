export default defineEventHandler(async (event) => {
  const reservationId = getRouterParam(event, 'reservationId')
  const client = createSafetyApiClient(event);
  const res = client.get(`/get-current-location/${reservationId}`);
  return res;
});
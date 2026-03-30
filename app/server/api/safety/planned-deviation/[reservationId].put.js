export default defineEventHandler(async (event) => {
  const reservationId = getRouterParam(event, 'reservationId');
  const query = getQuery(event);
  const client = createSafetyApiClient(event);
  const res = client.put(`/planned-deviation/${reservationId}`, { query });
  return res;
});
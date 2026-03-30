export default defineEventHandler(async (event) => {
  const aircraftReservationId = getRouterParam(event, 'aircraftReservationId');
  const client = createDroneApiClient(event);
  const res = client.get(`/aircraft/reserve/detail/${aircraftReservationId}`);
  return res;
});
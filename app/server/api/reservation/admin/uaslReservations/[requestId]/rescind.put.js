// 航路 + 機体 + 離着陸場 予約情報撤回
export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'requestId');
  const client = createReservationApiClient(event);
  const res = client.put(`/admin/uaslReservations/${requestId}/rescind`);
  return res;
});
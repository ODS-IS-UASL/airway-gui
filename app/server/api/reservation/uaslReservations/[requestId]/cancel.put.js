// 航路・機体・離着陸場を含む予約を取り消す
export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'requestId');
  const client = createReservationApiClient(event);
  const res = client.put(`/uaslReservations/${requestId}/cancel`);
  return res;
});
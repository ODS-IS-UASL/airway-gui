// 航路 + 機体 + 離着陸場 予約詳細情報取得。 空域干渉情報を含む。
export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'requestId');
  const client = createReservationApiClient(event);
  const res = client.get(`/uaslReservations/${requestId}`);
  return res;
});
// 指定された航路区画・機体・離着陸場予約情報を返す。
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createReservationApiClient(event);
  const res = client.post(`/uaslReservations/availability`, body);
  return res;
});
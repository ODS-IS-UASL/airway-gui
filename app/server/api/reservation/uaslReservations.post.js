// 航路・機体・離着陸場をまとめて予約する
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createReservationApiClient(event);
  const res = client.post(`/uaslReservations`, body);
  return res;
});
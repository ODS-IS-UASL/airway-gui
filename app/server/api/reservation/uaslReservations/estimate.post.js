// 航路・機体・離着陸場の料金概算を算出する
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createReservationApiClient(event);
  const res = client.post(`/uaslReservations/estimate`, body);
  return res;
});
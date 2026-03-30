// 管理者向け一覧取得（ページング対応）。
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createReservationApiClient(event);
  const res = client.get(`/admin/uaslReservations`, { query });
  return res;
});
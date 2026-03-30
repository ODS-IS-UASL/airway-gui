// 運航事業者IDでフィルタした一覧取得（ページング対応）
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const operatorId = getRouterParam(event, 'operatorId');
  const client = createReservationApiClient(event);
  const res = client.get(`/operator/${operatorId}/uaslReservations`, { query });
  return res;
});
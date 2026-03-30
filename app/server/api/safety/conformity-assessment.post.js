// 航路の適合性評価実行
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = createSafetyApiClient(event);
  const res = client.post(`/conformity-assessment`, body);
  return res;
});
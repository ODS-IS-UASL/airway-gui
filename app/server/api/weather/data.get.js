export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createWeatherApiClient(event);
  const res = client.get(`/data`, { query });
  return res;
});
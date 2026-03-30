export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const client = createWeatherApiClient(event);
  const res = client.get(`/index`, { query });
  return res;
});
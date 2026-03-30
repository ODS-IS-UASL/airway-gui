/* 指定した座標の標高(m)を取得
 * @param lon 経度
 * @param id 航路区画ID
 * @returns 標高(m)
 */

export const useGeoJsonGetSingleAltitude = async (lon, lat) => {
  let res;
  let url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lon}&lat=${lat}`;
  res = await $fetch(url)
  return res.elevation;
}
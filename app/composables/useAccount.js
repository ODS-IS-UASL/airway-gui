export const getcompanyName = (operatordata, operatorId) => {
  // まず localStorage キャッシュ（user_attr 取得結果）を検索
  try {
    if (typeof localStorage !== 'undefined') {
      const cachedStr = localStorage.getItem('uasl:userAttrCache');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        const found = cached.find(u => u.operatorId === operatorId);
        if (found) return found.operatorName;
      }
    }
  } catch (e) { /* ignore */ }

  // フォールバック: 従来の operatordata を検索
  let operatorName = "Not found";
  if (operatordata != undefined) {
    for(let i=0; i<operatordata.operatorList.length; i++){
        if (operatordata.operatorList[i].operatorId == operatorId) {
          operatorName = operatordata.operatorList[i].operatorName;
          break;
        }
    }
  }
  return operatorName;
}

/**
 * 全ユーザ属性を取得して localStorage にキャッシュする。
 * ナビゲーションコンポーネントや各ページの mounted で呼ぶ。
 */
export const initUserAttrCache = async () => {
  try {
    const config = useRuntimeConfig();
    const userAttrUrl = config.ouranos.userAttrUrl;
    const apiKey = config.ouranos.apiKey;
    const url = `${userAttrUrl}/user/api/v1/user_attr`;
    const headers = {
      'Content-Type': 'application/json',
      'API-Key': apiKey
    };
    const res = await $fetch(url, { method: 'POST', headers, body: {} });
    if (!res?.attributeList) return;
    const list = res.attributeList.map(u => ({
      operatorId: u.user_id,
      operatorName: u.operator_name,
    }));
    localStorage.setItem('uasl:userAttrCache', JSON.stringify(list));
  } catch (e) {
    console.warn('initUserAttrCache failed:', e);
  }
};
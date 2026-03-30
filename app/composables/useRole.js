/* 内部関数 */
export const role_check = async (page_role_list, virtual_role) => {
  let result = false;
  try {
    if (!Array.isArray(page_role_list)) return false;

    // role check
    const is_exist = page_role_list.includes(virtual_role)
    if (is_exist) result = true;

    return result;
  }  catch(error) {
    console.error(`role_check error: ${error}`);
    return result;
  }
}

/* CookieからRoleを取得し、検証をおこなう。
 * 　・表示可能なRoleならCookieから取得したRoleを返却する。
 * 　・表示不可なRoleなら別のエラーページにリダイレクトする。
 * @param page_role_list 各ページが持つroleリスト
 * @returns Cookieから取得したroleオブジェクト(JSON)
 */

export const roleVerification = async (page_role_list) => {
  let role_info = {};
  try {
    const virtual_role = localStorage.getItem('virtualRole');
    // ロールを検証
    const check_result = await role_check(page_role_list, virtual_role);
    if (check_result == false) {
      showError({
        statusCode: 403,
        statusMessage:
          'This role is not allowed to view the page.',
      });
      return role_info;
    }
    const roleList = localStorage.getItem('roleList');
    const operatorId = localStorage.getItem('uasl:user:operatorId');
    const operatorName = localStorage.getItem('uasl:user:operatorName');
    // role情報作成
    role_info = {
      operatorId: operatorId,
      operatorName: operatorName,
      roleList: roleList,
      virtual_role: virtual_role
    }
    return role_info;
  } catch(error) {
    role_info = {};
    console.error(`roleVerification error: ${error}`);
    return role_info;
  }
}

/* 検証は行わず、CookieからRoleを取得する。
 * @param なし
 * @returns Cookieから取得したroleオブジェクト(JSON)
 */
export const roleVerification_noncheck = async () => {
  let role_info = {};
  try {
    const roleList = localStorage.getItem('roleList');
    const operatorId = localStorage.getItem('uasl:user:operatorId');
    const operatorName = localStorage.getItem('uasl:user:operatorName');
    // role情報作成
    role_info = {
      operatorId: operatorId,
      operatorName: operatorName,
      roleList: roleList,
    }
    return role_info;
  } catch(error) {
    role_info = {};
    console.error(`roleVerification error: ${error}`);
    return role_info;
  }
}
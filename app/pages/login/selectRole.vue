<script setup>
  import LoginHeader from "~/components/navigation/loginHeader.vue";
  import { ref } from "vue"


  const role_type = ref(null);
  const role_123 = 7; // 0111 = role[1,2,3]
  const role_12 = 3; // 0011 = role[1,2]
  const role_13 = 5; // 0101 = role[1,3]
  const role_23 = 6; // 0110 = role[2,3]

  const setRoleMask = (roles) => {
    /*
        事業者
          - "1": 航路運営者
          - "2": 運航事業者
          - "3": 関係者
        ユーザ
          - "10": 航路運営者_責任者
          - "11": 航路運営者_担当者
          - "20": 運航事業者_責任者
          - "21": 運航事業者_担当者
    */
    const airwayManager = ["1", "10", "11"]; // 航路運営者
    const airwayOperator = ["2", "20", "21"]; // 運航事業者
    const stakeholder = ["3"]; // 関係者
    const airwayManagerFlg = airwayManager.some(t => roles.includes(t));
    const airwayOperatorFlg = airwayOperator.some(t => roles.includes(t))
    const stakeholderFlg = stakeholder.some(t => roles.includes(t))

    if (airwayManagerFlg &&
        airwayOperatorFlg &&
        stakeholderFlg) {
      role_type.value = role_123;
      localStorage.setItem('roleList', ["1", "2", "3"]);
    } else if (airwayManagerFlg &&
              airwayOperatorFlg) {
      role_type.value = role_12;
      localStorage.setItem('roleList', ["1", "2"]);
    }  else if (airwayManagerFlg &&
              stakeholderFlg) {
      role_type.value = role_13;
      localStorage.setItem('roleList', ["1", "3"]);
    }  else if (airwayOperatorFlg &&
              stakeholderFlg) {
      role_type.value = role_23;
      localStorage.setItem('roleList', ["2", "3"]);
    } else {
      localStorage.setItem('roleList', roles[0]);
      let role;
      if (airwayManagerFlg) {
        role = "1";
      } else if (airwayOperatorFlg) {
        role = "2";
      } else {
        role = "3";
      }
      setLocalStorageRole(role);
    }
    return;
  }

  const setLocalStorageRole = (role) => {
    try {
      let role_str = "";
      switch (role) {
        case '1':
          role_str = "1";
          break;
        case '2':
          role_str = "2";
          break;
        case '3':
        default:
          role_str = "3";
          break;
      }
      // 選択されたroleをLocalsession設定後にリダイレクト
      localStorage.setItem('virtualRole', role_str);
      location.href="/airwayStatus";
    } catch (error) {
      console.error(`setLocalStorageRole error(${error})`);
    }
  }
  
  onMounted(async () => {
    const config = useRuntimeConfig();
    const ROLES_COOKIE = config.public.ouranos.cookie.roles;
    const OPERATOR_ID_COOKIE = config.public.ouranos.cookie.operatorId;
    const PARENT_OPERATOR_ID_COOKIE = config.public.ouranos.cookie.parentOperatorId;
    const OPERATOR_NAME_COOKIE = config.public.ouranos.cookie.operatorName;
    const roles = useCookie(ROLES_COOKIE);
    const operatorId = useCookie(OPERATOR_ID_COOKIE);
    const parentOperatorId = useCookie(PARENT_OPERATOR_ID_COOKIE);
    const operatorName = useCookie(OPERATOR_NAME_COOKIE);
    localStorage.setItem('uasl:user:parentOperatorId', parentOperatorId.value);
    localStorage.setItem('uasl:user:operatorId', operatorId.value);
    localStorage.setItem('uasl:user:operatorName', operatorName.value);
    if (!roles.value || roles.value.length === 0) {
      showError({
        statusCode: 500,
        message: 'No role.'
      })
    }
    try {
      setRoleMask(roles.value);
    }  catch (error) {
      console.error(`setRoleMask error(${error})`);
    }
  })
</script>

<template>
  <!-- グローバルナビゲーション -->
  <LoginHeader />
  <!-- コンテンツ -->
  <main id="main" class="b-pageMain b-login">
    <div class="b-loginForm" v-if="role_type == role_123">
      <input type="button" class="e-button" value="航路運営者" @click="setLocalStorageRole('1')" />
      <input type="button" class="e-button" value="運航事業者" @click="setLocalStorageRole('2')" />
      <input type="button" class="e-button" value="　関係者　" @click="setLocalStorageRole('3')" />
    </div>
    <div class="b-loginForm" v-if="role_type == role_12">
      <input type="button" class="e-button" value="航路運営者" @click="setLocalStorageRole('1')" />
      <input type="button" class="e-button" value="運航事業者" @click="setLocalStorageRole('2')" />
    </div>
    <div class="b-loginForm" v-if="role_type == role_13">
      <input type="button" class="e-button" value="航路運営者" @click="setLocalStorageRole('1')" />
      <input type="button" class="e-button" value="　関係者　" @click="setLocalStorageRole('3')" />
    </div>
    <div class="b-loginForm" v-if="role_type == role_23">
      <input type="button" class="e-button" value="運航事業者" @click="setLocalStorageRole('2')" />
      <input type="button" class="e-button" value="　関係者　" @click="setLocalStorageRole('3')" />
    </div>
  </main>
</template>

<style>
.e-loginTitle{
  color:#AF0075;
  font-size: 36px;
  top: 76px;
  left: 32px;
  width: 236px;
  height: 82px;
  border: 1px solid var(--unnamed-color-707070);
  opacity: 1;
  padding: 1rem;
}

.e-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0px 16px;
  font-size: 18px;
  font-weight: 500;
  border-radius: 50px;
  background-color: #2c69ff;
  color: #ffffff;
  text-decoration: none;
  transition: background-color 0.3s, color 0.3s;
  position: relative; /* 必要に応じて追加 */
  height: 48px !important;
}

</style>
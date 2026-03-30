<template>
    <button type="button" @click="oidc" class="v-btn v-btn--icon v-theme--light v-btn--density-default v-btn--rounded v-btn--size-default v-btn--variant-text drn_menu__btn drn_menu__btn--dips">
      <span class="v-btn__overlay"></span>
      <span class="v-btn__underlay"></span>
      <span class="v-btn__content" data-no-activator="">
        <div class="drn_menu__btn_content">
          <div class="v-badge drn_menu__badge">
            <div class="v-badge__wrapper">
              <img src="/assets/css/img/menu/dips.svg" width="45" height="45">
              <span v-if="checkImg"
                class="v-badge__badge v-theme--light bg-emerald"
                aria-atomic="true"
                aria-label="Badge"
                aria-live="polite"
                role="status"
                style="bottom: calc(100% - 12px); left: calc(100% - 12px);">
                <img src="/assets/css/img/menu/check-solid.svg" width="5" height="5">
              </span>
            </div>
          </div>
        </div>
      </span>
    </button>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const checkImg = ref('');
const loginState = ref(false);
const config = useRuntimeConfig();
const authEndPoint = config.public.oidcAuthEndPointDev;
const redirectUri = config.public.oidcRedirectUri;
const clientId = config.public.oidcClientId;
const responseType = config.public.oidcResponseType;
const scope = config.public.oidcScope;

console.log("authEndPoint : " + authEndPoint);
console.log("redirectUri : " + redirectUri);
console.log("clientId : " + clientId);
console.log("responseType : " + responseType);
console.log("scope : " + scope);

onMounted(async () => {
  try {
    const response = await $fetch('/api/misc/dipsTokenVerification', { 
      method: 'POST',
      body: {}
    });
    if (response.status === 200) {
      // ログイン済み
      console.log("Already login.");
      checkImg.value = true;
      loginState.value = true;
    } else {
      // 未ログイン
      console.log("Not login.");
      checkImg.value = false;
    }
  } catch (error) {
    console.error('Failed to verify token : ', error)
    // 未ログイン
    checkImg.value = false;
  } finally {
    console.log("Verify Token end.");
  }
})

function startOIDCLogin() {
  console.log("startOIDCLogin() start.");      

  // state 作成
  const state = Math.random().toString(36).substring(2);
  console.log("state : " + state);

  // ブラウザにデータを保存
  sessionStorage.setItem('oidc_state', state);

  const params = new URLSearchParams({
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    state: state,
  });

  const url = authEndPoint + "?" + params;
  console.log("url : " + url);
  // 新しいウィンドウでリンクを開く
  const childWindow = window.open(url, "_blank", "width=800,height=800,resizable=yes");

  console.log("startOIDCLogin() end.");
  return childWindow;
}

function alreadyOIDCLogin() {
  // ログイン済み
  const params = new URLSearchParams({
    loginState: true
  });
  const url = redirectUri + "?" + params;
  const childWindow = window.open(url, "_blank", "width=800,height=800,resizable=yes");
  return childWindow;
}

function oidc() {
  let childWindow;
  if (loginState.value) {
    // ログイン済み
    childWindow = alreadyOIDCLogin();
  } else {
    // 未ログイン
    childWindow = startOIDCLogin();
  }
  // 子ウィンドウ(OIDC画面)が閉じられた場合に親ウィンドウリロード(DIPSログインボタン変更のため)
  const checkChildClosed = setInterval(function() {
    if (childWindow.closed) {
      clearInterval(checkChildClosed); // 監視停止
      location.reload(); // 親ウィンドウリロード
    }
  }, 500);
}
</script>

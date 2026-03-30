<template>
  <div class="message-overlay">
    <p>{{ message }}</p>
    <button class="button" @click="closeWindow">戻る</button>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  definePageMeta({ auth: false });

  const message = ref('');
  const msgAuthenticating = "認証確認中...";
  const msgSuccess = "DIPS 連携機能が有効になりました。";
  const msgFailed = "DIPS ログインに失敗しました。";
  const msgAlreadyValid = "DIPS 連携は既に有効になっています。";

  message.value = msgAuthenticating;

  onMounted(async () => {
    console.log("callback(authorization-code.vue) start.");
    // クエリパラメータから code, state を取得
    const urlParams = new URLSearchParams(window.location.search);
    console.log("urlParams : " + urlParams);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const loginState = urlParams.get('loginState');
    console.log('loginState : ' + loginState);
    if (loginState) {
      // ログイン済み
      message.value = msgAlreadyValid;
      return;
    }

    if (code == null) {
      console.log('code is null or undefined.');
      console.log('redirect error : ' + error);
      message.value = msgFailed;
      return;
    }

    if (!verifyState(state)) {
      message.value = msgFailed;
      return;
    }

    let response;
    const body = { code: code };
    try {
      response = await $fetch('/api/misc/dipsToken', { 
        method: 'PUT',
        body: body
      });
      if (response.status !== 200) {
        console.error(`Failed to getDipsToken.(status:${response.status}).`);
        message.value = msgFailed;
        return;
      }
    } catch (error) {
      console.error('Failed to put token.');
      message.value = msgFailed;
      return;
    }

    console.log("callback(authorization-code.vue) end.");
    message.value = msgSuccess;
    return;
  })

  // state 検証(ログイン前に作成した state と一致するか確認)
  function verifyState(state) {
    if (state == null) {
      return false;
    }
    const storedState = sessionStorage.getItem('oidc_state');
    if (state !== storedState) {
      console.error("state not match.");
      return false;
    }
    return true;
  }

  // 現在のウィンドウを閉じる
  function closeWindow() {
    window.close();
  }
</script>

<style>
  .message-overlay {
    display: flex;
    flex-direction: column; /* 下に情報を並べる */
    justify-content: center; /* 縦方向の中心に配置 */
    align-items: center; /* 横方向の中心に配置 */
    height: 100vh; /* フルスクリーンの高さを確保 */
    width: 100vw; /* フルスクリーンの幅を確保 */
    position: fixed; /* スクロールに関係なく画面に固定 */
    top: 0;
    left: 0;
    z-index: 1000; /* 他の要素よりも前面に表示 */
  }

  .button {
    margin-top: 20px;
    border-bottom: 1px solid #000000;
    border-right: 1px solid #000000;
    background-color: #FFFFFF;
    color: #000000;
    cursor: pointer;
    padding: 0.5rem;
    padding-left: 1rem;
    padding-right: 1rem;
  }
</style>
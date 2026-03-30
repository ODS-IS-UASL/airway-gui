<script setup>
import oidcDips from "../oidcDips.vue";
import SetNotice from '~/components/notice/setNoticeData.vue'

const showOverlay = ref(false);
function airwayClickEvent() {
  showOverlay.value = !showOverlay.value;
}

const showDronePortOverlay = ref(false);
function droneClickEvent() {
  showDronePortOverlay.value = !showDronePortOverlay.value;
}

const showLoginOverlay = ref(false);
function loginClickEvent() {
  showLoginOverlay.value = !showLoginOverlay.value;
}
async function logout() {
  console.log('logout() start.');
  localStorage.removeItem("uasl:user:parentOperatorId");
  localStorage.removeItem("uasl:user:operatorId");
  localStorage.removeItem("uasl:user:operatorName");
  localStorage.removeItem("roleList");
  localStorage.removeItem("virtualRole");
  await $fetch('/api/auth/logout', { 
    method: 'GET',
  });
  navigateTo('/login', { replace: true })
}

//通知バッジ
const notificationBadge = ref('');
let timerId = null

const route = useRoute()

const shouldShowSetNotice = computed(() => {
  // ルートパスが '/notification' のときは false
  //通知一覧画面では独自取得しているため呼ばせない
  return route.path !== '/notification'
})

const cookie_role = await roleVerification_noncheck() || '';

const displayOperatorName = computed(() => {
  const opName = cookie_role.operatorName || '';
  if(!opName){
    return "TK";
  }
  // 空白で分割し、空文字は除去
  const parts = opName.split(' ').filter(part => part.trim() !== '');
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return parts[0].charAt(0);
  }
  // 2つ以上の場合は、最初の2つの部分の先頭文字を連結
  return parts[0].charAt(0) + parts[1].charAt(0);
});

onMounted(() => {
  if(shouldShowSetNotice.value){
    notificationBadge.value = localStorage.getItem('notificationBadge');
  timerId = setInterval(() => {
    notificationBadge.value = localStorage.getItem('notificationBadge');
  }, 10 * 1000) // 10秒
  }
  // 全ユーザ属性をキャッシュ（運航事業者名変換用）
  initUserAttrCache();
});

</script>

<template>
    <SetNotice  v-if="shouldShowSetNotice"/>
<nav class="b-systemMenu v-navigation-drawer v-navigation-drawer--left v-navigation-drawer--floating v-navigation-drawer--rail v-navigation-drawer--active v-theme--light bg-gray-medium border-nec-blue border-t-lg border-opacity-100 v-navigation-drawer--mobile drn_sidebar"  style="left: 0px; z-index: 1004; transform: translateX(0px); position: fixed; height: calc(100% + 0px); top: 0px; bottom: 0px; width: 64px;">
  <div class="v-sheet v-theme--light drn_logo">
    <div class="v-responsive v-img drn_logo__img" style="height: 48px; width: 48px;">
      <div class="v-responsive__sizer" style="padding-bottom: 100%;"></div>
      <img class="v-img__img v-img__img--cover" src="/assets/css/img/systemLogo.png" style="">
    </div>
  </div>
  <div class="v-list v-list--nav v-theme--light bg-transparent v-list--density-default v-list--one-line drn_menu" tabindex="0" role="listbox">
  <a href="/airwayStatus" class="v-list-item v-list-item--link v-list-item--nav v-theme--light v-list-item--density-default v-list-item--two-line v-list-item--rounded v-list-item--variant-text drn_menu__btn" tabindex="-2" aria-selected="false">
    <span class="v-list-item__overlay"></span>
    <span class="v-list-item__underlay"></span>
    <div class="v-list-item__content" data-no-activator="">
      <div class="drn_menu__btn_content">
        <img src="/assets/css/img/menu/map-location-dot-solid.svg" width="25" height="25">
      <div class="v-list-item-subtitle drn_menu__btn_text" >運航状況</div>
    </div>
  </div>
  </a>
  <a href="/airwayReservation" class="v-list-item v-list-item--link v-list-item--nav v-theme--light v-list-item--density-default v-list-item--two-line v-list-item--rounded v-list-item--variant-text drn_menu__btn" tabindex="-2" aria-selected="true">
    <span class="v-list-item__overlay"></span>
    <span class="v-list-item__underlay"></span>
    <div class="v-list-item__content" data-no-activator="">
      <div class="drn_menu__btn_content">
        <img src="/assets/css/img/menu/calendar-check-solid.svg" width="25" height="25">
      </div>
      <div class="v-list-item-subtitle drn_menu__btn_text">予約一覧</div>
    </div>
  </a>
  <a v-on:click="droneClickEvent" class="v-list-item v-list-item--link v-list-item--nav v-theme--light v-list-item--density-default v-list-item--two-line v-list-item--rounded v-list-item--variant-text drn_menu__btn" tabindex="-2" aria-selected="false">
    <span class="v-list-item__overlay"></span>
    <span class="v-list-item__underlay"></span>
    <div class="v-list-item__content" data-no-activator="">
      <div class="drn_menu__btn_content">
        <img src="/assets/css/img/menu/location-dot-solid.svg" width="25" height="25">
      </div>
      <div class="v-list-item-subtitle drn_menu__btn_text" >離着陸場<br>一覧</div>
    </div>
  </a>
  <a href="/drone" class="v-list-item v-list-item--link v-list-item--nav v-theme--light v-list-item--density-default v-list-item--three-line v-list-item--rounded v-list-item--variant-text drn_menu__btn" tabindex="-2" aria-selected="false">
    <span class="v-list-item__overlay"></span>
    <span class="v-list-item__underlay"></span>
    <div class="v-list-item__content" data-no-activator="">
      <div class="drn_menu__btn_content">
        <svg id="quadcopter" width="25" height="25"xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>quadcopter</title><path d="M5.5,1C8,1 10,3 10,5.5C10,6.38 9.75,7.2 9.31,7.9L9.41,8H14.59L14.69,7.9C14.25,7.2 14,6.38 14,5.5C14,3 16,1 18.5,1C21,1 23,3 23,5.5C23,8 21,10 18.5,10C17.62,10 16.8,9.75 16.1,9.31L15,10.41V13.59L16.1,14.69C16.8,14.25 17.62,14 18.5,14C21,14 23,16 23,18.5C23,21 21,23 18.5,23C16,23 14,21 14,18.5C14,17.62 14.25,16.8 14.69,16.1L14.59,16H9.41L9.31,16.1C9.75,16.8 10,17.62 10,18.5C10,21 8,23 5.5,23C3,23 1,21 1,18.5C1,16 3,14 5.5,14C6.38,14 7.2,14.25 7.9,14.69L9,13.59V10.41L7.9,9.31C7.2,9.75 6.38,10 5.5,10C3,10 1,8 1,5.5C1,3 3,1 5.5,1M5.5,3A2.5,2.5 0 0,0 3,5.5A2.5,2.5 0 0,0 5.5,8A2.5,2.5 0 0,0 8,5.5A2.5,2.5 0 0,0 5.5,3M5.5,16A2.5,2.5 0 0,0 3,18.5A2.5,2.5 0 0,0 5.5,21A2.5,2.5 0 0,0 8,18.5A2.5,2.5 0 0,0 5.5,16M18.5,3A2.5,2.5 0 0,0 16,5.5A2.5,2.5 0 0,0 18.5,8A2.5,2.5 0 0,0 21,5.5A2.5,2.5 0 0,0 18.5,3M18.5,16A2.5,2.5 0 0,0 16,18.5A2.5,2.5 0 0,0 18.5,21A2.5,2.5 0 0,0 21,18.5A2.5,2.5 0 0,0 18.5,16M3.91,17.25L5.04,17.91C5.17,17.81 5.33,17.75 5.5,17.75A0.75,0.75 0 0,1 6.25,18.5L6.24,18.6L7.37,19.25L7.09,19.75L5.96,19.09C5.83,19.19 5.67,19.25 5.5,19.25A0.75,0.75 0 0,1 4.75,18.5L4.76,18.4L3.63,17.75L3.91,17.25M3.63,6.25L4.76,5.6L4.75,5.5A0.75,0.75 0 0,1 5.5,4.75C5.67,4.75 5.83,4.81 5.96,4.91L7.09,4.25L7.37,4.75L6.24,5.4L6.25,5.5A0.75,0.75 0 0,1 5.5,6.25C5.33,6.25 5.17,6.19 5.04,6.09L3.91,6.75L3.63,6.25M16.91,4.25L18.04,4.91C18.17,4.81 18.33,4.75 18.5,4.75A0.75,0.75 0 0,1 19.25,5.5L19.24,5.6L20.37,6.25L20.09,6.75L18.96,6.09C18.83,6.19 18.67,6.25 18.5,6.25A0.75,0.75 0 0,1 17.75,5.5L17.76,5.4L16.63,4.75L16.91,4.25M16.63,19.25L17.75,18.5A0.75,0.75 0 0,1 18.5,17.75C18.67,17.75 18.83,17.81 18.96,17.91L20.09,17.25L20.37,17.75L19.25,18.5A0.75,0.75 0 0,1 18.5,19.25C18.33,19.25 18.17,19.19 18.04,19.09L16.91,19.75L16.63,19.25Z" /></svg>
      </div>
      <div class="v-list-item-subtitle drn_menu__btn_text" >ドローン<br>機体一覧</div>
    </div>
  </a>
  <a v-on:click="airwayClickEvent" class="v-list-item v-list-item--link v-list-item--nav v-theme--light v-list-item--density-default v-list-item--two-line v-list-item--rounded v-list-item--variant-text drn_menu__btn" tabindex="-2" aria-selected="false" aria-haspopup="menu" aria-expanded="false" aria-owns="menu5sub">
    <span class="v-list-item__overlay"></span>
    <span class="v-list-item__underlay"></span>
    <div class="v-list-item__content" data-no-activator="">
      <span class="v-btn__content drn_menu__btn_content" data-no-activator="">
        <img src="/assets/css/img/menu/road-solid.svg" width="25" height="25">
      <img src="/assets/css/img/menu/caret-right-solid.svg" class="mdi v-icon notranslate v-theme--light v-icon--size-small drn_menu__btn_caret" width="15" height="15" style="transform: rotate(45deg); margin-bottom: -20px;">
    </span>
    <div class="v-list-item-subtitle drn_menu__btn_text" >航路画定</div>
  </div>
  </a>
</div>

<div class="drn_menu drn_sidebar__util">
  <oidcDips></oidcDips>
  <button onclick="location.href='/notification'" type="button" class="v-btn v-btn--icon v-theme--light v-btn--density-default v-btn--rounded v-btn--size-default v-btn--variant-text drn_menu__btn drn_menu__btn--notification">
    <span class="v-btn__overlay"></span>
    <span class="v-btn__underlay"></span>
    <span class="v-btn__content" data-no-activator="">
      <div class="v-badge drn_menu__badge drn_menu__badge--notification">
        <div class="v-badge__wrapper">
          <img src="/assets/css/img/menu/bell-solid.svg" width="25" height="25">
          <span v-if="notificationBadge" class="v-badge__badge v-theme--light bg-rose" aria-atomic="true" aria-label="Badge" aria-live="polite" role="status" style="bottom: calc(100% - 12px); left: calc(100% - 12px);">{{notificationBadge}}</span>
        </div>
      </div>
    </span>
  </button>
  <button type="button" v-on:click="loginClickEvent" :title="cookie_role ? (cookie_role.operatorName || '') : ''" class="v-btn v-btn--icon v-theme--light v-btn--density-default v-btn--rounded v-btn--size-default v-btn--variant-text drn_menu__btn drn_menu__btn--user" aria-haspopup="menu" aria-expanded="false" aria-owns="menu5sub">
    <span class="v-btn__overlay"></span>
    <span class="v-btn__underlay"></span>
    <span class="v-btn__content" data-no-activator="">
      <div class="v-avatar v-theme--light bg-nec-gray-4 v-avatar--density-default v-avatar--size-x-small v-avatar--variant-flat drn_menu__avatar">{{ displayOperatorName }}
        <span class="v-avatar__underlay"></span>
      </div>
      <img src="/assets/css/img/menu/caret-right-solid.svg" class="mdi v-icon notranslate v-theme--light v-icon--size-small drn_menu__btn_caret" width="15" height="15" style="transform: rotate(45deg); margin-bottom: -20px;">
    </span>
  </button>
<div v-if="showOverlay" class="v-overlay__content" style="position: fixed; top: 398.4px; left: 65px; --v-overlay-anchor-origin: right top; transform-origin: left top; max-width: 902.4px; max-height: 706.4px;">
  <div class="v-list v-list--slim v-theme--light v-list--density-compact v-list--one-line drn_menu_sub" tabindex="0" role="listbox">
    <a href="/airway" class="v-list-item v-list-item--link v-list-item--slim v-theme--light v-list-item--density-compact v-list-item--one-line rounded-0 v-list-item--variant-text drn_menu_sub__btn" tabindex="-2" aria-selected="false">
      <span class="v-list-item__overlay"></span>
      <span class="v-list-item__underlay"></span>
      <div class="v-list-item__prepend">
        <img src="/assets/css/img/menu/road-solid-gray.svg" width="20" height="20">
        <div class="v-list-item__spacer"></div>
      </div>
      <div class="v-list-item__content" data-no-activator="">
        <div class="v-list-item-title drn_menu_sub__btn_text"> 航路画定 </div>
      </div>
    </a>
    <a href="/fallToleranceRange" class="v-list-item v-list-item--link v-list-item--slim v-theme--light v-list-item--density-compact v-list-item--one-line rounded-0 v-list-item--variant-text drn_menu_sub__btn" tabindex="-2" aria-selected="false">
      <span class="v-list-item__overlay"></span>
      <span class="v-list-item__underlay"></span>
      <div class="v-list-item__prepend">
        <img src="/assets/css/img/menu/vector-square-solid.svg" width="20" height="20">
        <div class="v-list-item__spacer"></div>
      </div>
      <div class="v-list-item__content" data-no-activator="">
        <div class="v-list-item-title drn_menu_sub__btn_text"> 最大落下範囲 </div>
      </div>
    </a>
  </div>
</div>
<div v-if="showDronePortOverlay" class="v-overlay__content" style="position: fixed; top: 235px; left: 65px; --v-overlay-anchor-origin: right top; transform-origin: left top; max-width: 902.4px; max-height: 706.4px;">
  <div class="v-list v-list--slim v-theme--light v-list--density-compact v-list--one-line drn_menu_sub" tabindex="0" role="listbox">
    <a href="/dronePort" class="v-list-item v-list-item--link v-list-item--slim v-theme--light v-list-item--density-compact v-list-item--one-line rounded-0 v-list-item--variant-text drn_menu_sub__btn" tabindex="-2" aria-selected="false">
      <span class="v-list-item__overlay"></span>
      <span class="v-list-item__underlay"></span>
      <div class="v-list-item__prepend">
        <img src="/assets/css/img/menu/location-dot-solid-gray.svg" width="20" height="20">
        <div class="v-list-item__spacer"></div>
      </div>
      <div class="v-list-item__content" data-no-activator="">
        <div class="v-list-item-title drn_menu_sub__btn_text"> 離着陸場一覧 </div>
      </div>
    </a>
    <a href="/dronePort/map" class="v-list-item v-list-item--link v-list-item--slim v-theme--light v-list-item--density-compact v-list-item--one-line rounded-0 v-list-item--variant-text drn_menu_sub__btn" tabindex="-2" aria-selected="false">
      <span class="v-list-item__overlay"></span>
      <span class="v-list-item__underlay"></span>
      <div class="v-list-item__prepend">
        <img src="/assets/css/img/menu/location-dot-solid-gray.svg" width="20" height="20">
        <div class="v-list-item__spacer"></div>
      </div>
      <div class="v-list-item__content" data-no-activator="">
        <div class="v-list-item-title drn_menu_sub__btn_text"> 離着陸場地図 </div>
      </div>
    </a>
    <a href="/dronePort/reserve" class="v-list-item v-list-item--link v-list-item--slim v-theme--light v-list-item--density-compact v-list-item--one-line rounded-0 v-list-item--variant-text drn_menu_sub__btn" tabindex="-2" aria-selected="false">
      <span class="v-list-item__overlay"></span>
      <span class="v-list-item__underlay"></span>
      <div class="v-list-item__prepend">
        <img src="/assets/css/img/menu/location-dot-solid-gray.svg" width="20" height="20">
        <div class="v-list-item__spacer"></div>
      </div>
      <div class="v-list-item__content" data-no-activator="">
        <div class="v-list-item-title drn_menu_sub__btn_text"> 離着陸場予約一覧 </div>
      </div>
    </a>
  </div>
</div>
<div v-if="showLoginOverlay" class="v-overlay__content" style="position: fixed; bottom: 0px; left: 65px; --v-overlay-anchor-origin: right bottom; transform-origin: left bottom; max-width: 902.4px; max-height: 706.4px;">
  <div class="v-list v-list--slim v-theme--light v-list--density-compact v-list--one-line drn_menu_sub" tabindex="0" role="listbox">
    <button @click="logout()" class="v-list-item v-list-item--link v-list-item--slim v-theme--light v-list-item--density-compact v-list-item--one-line rounded-0 v-list-item--variant-text drn_menu_sub__btn" tabindex="-2" aria-selected="false">
      <span class="v-list-item__overlay"></span>
      <span class="v-list-item__underlay"></span>
      <div class="v-list-item__content" data-no-activator="">
        <div class=" e-pageSubMenuLink v-list-item-title drn_menu_sub__btn_text">ログアウト</div>
      </div>
    </button>
  </div>
</div>

</div>
  </nav>

</template>

<style>
.v-overlay__content {
  box-shadow: 0 5px 5px -3px var(--v-shadow-key-umbra-opacity,#0003),0 8px 10px 1px var(--v-shadow-key-penumbra-opacity,#00000024),0 3px 14px 2px var(--v-shadow-key-ambient-opacity,#0000001f);
  z-index: 20000;
  width: 210px;
  border-radius: 4px !important;
}

.v-list {
  border-top-left-radius: 4px !important;
  border-top-right-radius: 4px !important;
  border-bottom-left-radius: 4px !important;
  border-bottom-right-radius: 4px !important;
}

.v-list-item__spacer {
  width: 20px;
}

.e-pageSubMenuLink {
  margin-bottom: 0!important;
  &:hover {
    background-color: #cccccc00!important;
  }
}

.popup-login-option {
  position: absolute;
  left: 64px;
  bottom: 20px;
  height: 150px;
  width: 220px;
  background-color: #ffffff;
  border: 1px solid #f0f0f0;
  z-index: 20000;
}

.border-nec-blue {
    --v-border-color: var(--v-theme-nec-blue);
}

.bg-gray-medium {
    --v-theme-overlay-multiplier: var(--v-theme-gray-medium-overlay-multiplier);
    background-color: rgb(var(--v-theme-gray-medium)) !important;
    color: rgb(var(--v-theme-on-gray-medium)) !important;
}

.bg-emerald {
    --v-theme-overlay-multiplier: var(--v-theme-emerald-overlay-multiplier);
    background-color: rgb(var(--v-theme-emerald)) !important;
    color: rgb(var(--v-theme-on-emerald)) !important;
}

.bg-rose {
    --v-theme-overlay-multiplier: var(--v-theme-rose-overlay-multiplier);
    background-color: rgb(var(--v-theme-rose)) !important;
    color: rgb(var(--v-theme-on-rose)) !important;
}

.bg-nec-gray-4 {
    --v-theme-overlay-multiplier: var(--v-theme-nec-gray-4-overlay-multiplier);
    background-color: rgb(var(--v-theme-nec-gray-4)) !important;
    color: rgb(var(--v-theme-on-nec-gray-4)) !important;
}

#quadcopter {
  fill: white!important; /* 塗りつぶしの色を赤に変更 */
}


.v-theme--light {
    color-scheme: normal;
    --v-theme-background: 255, 255, 255;
    --v-theme-background-overlay-multiplier: 1;
    --v-theme-surface: 255, 255, 255;
    --v-theme-surface-overlay-multiplier: 1;
    --v-theme-surface-bright: 255, 255, 255;
    --v-theme-surface-bright-overlay-multiplier: 1;
    --v-theme-surface-light: 238, 238, 238;
    --v-theme-surface-light-overlay-multiplier: 1;
    --v-theme-surface-variant: 66, 66, 66;
    --v-theme-surface-variant-overlay-multiplier: 2;
    --v-theme-on-surface-variant: 238, 238, 238;
    --v-theme-primary: 44, 105, 255;
    --v-theme-primary-overlay-multiplier: 2;
    --v-theme-primary-darken-1: 31, 85, 146;
    --v-theme-primary-darken-1-overlay-multiplier: 2;
    --v-theme-secondary: 93, 108, 132;
    --v-theme-secondary-overlay-multiplier: 2;
    --v-theme-secondary-darken-1: 1, 135, 134;
    --v-theme-secondary-darken-1-overlay-multiplier: 1;
    --v-theme-error: 230, 30, 140;
    --v-theme-error-overlay-multiplier: 1;
    --v-theme-info: 44, 105, 255;
    --v-theme-info-overlay-multiplier: 2;
    --v-theme-success: 20, 205, 180;
    --v-theme-success-overlay-multiplier: 1;
    --v-theme-warning: 255, 140, 0;
    --v-theme-warning-overlay-multiplier: 1;
    --v-theme-nec-blue: 15, 30, 210;
    --v-theme-nec-blue-overlay-multiplier: 2;
    --v-theme-nec-gray-4: 167, 175, 193;
    --v-theme-nec-gray-4-overlay-multiplier: 1;
    --v-theme-nec-gray-10: 40, 45, 60;
    --v-theme-nec-gray-10-overlay-multiplier: 2;
    --v-theme-gray-medium: 102, 117, 148;
    --v-theme-gray-medium-overlay-multiplier: 2;
    --v-theme-default: 239, 242, 246;
    --v-theme-default-overlay-multiplier: 1;
    --v-theme-sky: 44, 105, 255;
    --v-theme-sky-overlay-multiplier: 2;
    --v-theme-emerald: 20, 205, 180;
    --v-theme-emerald-overlay-multiplier: 1;
    --v-theme-lime: 200, 230, 10;
    --v-theme-lime-overlay-multiplier: 1;
    --v-theme-orange: 255, 140, 0;
    --v-theme-orange-overlay-multiplier: 1;
    --v-theme-rose: 230, 30, 140;
    --v-theme-rose-overlay-multiplier: 1;
    --v-theme-on-background: 0, 0, 0;
    --v-theme-on-surface: 0, 0, 0;
    --v-theme-on-surface-bright: 0, 0, 0;
    --v-theme-on-surface-light: 0, 0, 0;
    --v-theme-on-primary: 255, 255, 255;
    --v-theme-on-primary-darken-1: 255, 255, 255;
    --v-theme-on-secondary: 255, 255, 255;
    --v-theme-on-secondary-darken-1: 255, 255, 255;
    --v-theme-on-error: 255, 255, 255;
    --v-theme-on-info: 255, 255, 255;
    --v-theme-on-success: 0, 0, 0;
    --v-theme-on-warning: 255, 255, 255;
    --v-theme-on-nec-blue: 255, 255, 255;
    --v-theme-on-nec-gray-4: 0, 0, 0;
    --v-theme-on-nec-gray-10: 255, 255, 255;
    --v-theme-on-gray-medium: 255, 255, 255;
    --v-theme-on-default: 0, 0, 0;
    --v-theme-on-sky: 255, 255, 255;
    --v-theme-on-emerald: 0, 0, 0;
    --v-theme-on-lime: 0, 0, 0;
    --v-theme-on-orange: 255, 255, 255;
    --v-theme-on-rose: 255, 255, 255;
    --v-border-color: 0, 0, 0;
    --v-border-opacity: 0.12;
    --v-high-emphasis-opacity: 0.87;
    --v-medium-emphasis-opacity: 0.6;
    --v-disabled-opacity: 0.38;
    --v-idle-opacity: 0.04;
    --v-hover-opacity: 0.04;
    --v-focus-opacity: 0.12;
    --v-selected-opacity: 0.08;
    --v-activated-opacity: 0.12;
    --v-pressed-opacity: 0.12;
    --v-dragged-opacity: 0.08;
    --v-theme-kbd: 33, 37, 41;
    --v-theme-on-kbd: 255, 255, 255;
    --v-theme-code: 245, 245, 245;
    --v-theme-on-code: 0, 0, 0;
}

</style>
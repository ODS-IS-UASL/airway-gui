<script setup>
/**
 * ページ内サブメニュー一覧
 */

import { ref } from 'vue';
const props = defineProps({
  open: {
    type: Boolean,
    default: true, // サブメニューの開閉設定
  },
});

const isOpen = ref(props.open);

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

</script>

<template>
  <nav :class="{'c-pageSubMenu--closed': !isOpen, 'c-pageSubMenu': isOpen}">
    <!-- サブメニュー項目 -->
    <ul v-if="isOpen" class="c-pageSubMenuList">
      <li class="c-pageSubMenuListItem">
        <a class="e-pageSubMenuLink" href="/airway">航路画定</a>
      </li>
      <li class="c-pageSubMenuListItem">
        <a class="e-pageSubMenuLink" href="#">航路閉塞</a>
      </li>
      <li class="c-pageSubMenuListItem">
        <a class="e-pageSubMenuLink" href="/fallToleranceRange">最大落下範囲</a>
      </li>
    </ul>

    <!-- 開閉ボタンエリア -->
    <div class="c-pageSubMenuToggle">
      <!-- 拡大ボタン -->
      <button v-if="!isOpen" @click="toggleMenu" class="e-pageSubMenuOpenButton">
        <img src="~/assets/css/img/subMenu-open.png" alt="サブメニューを開く" />
      </button>

      <!-- 縮小ボタン -->
      <button v-if="isOpen" @click="toggleMenu" class="e-pageSubMenuCloseButton">
        <img src="~/assets/css/img/subMenu-close.png" alt="サブメニューを閉じる" />
      </button>
    </div>
  </nav>
</template>

<style>
.c-pageSubMenu {
  width: 250px;
}

.c-pageSubMenu--closed {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-content: center;
  justify-content: flex-start;
  align-items: center;
  height: 100%;
  background-color: #ffffff;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2000;
  border: 1px solid #707070;
  width: var(--page-subMenu-width); /* サブメニューが閉じているときの幅を指定 */
}
</style>
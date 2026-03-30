<template>
  <div class="drn_form__header">
    <div class="drn_form__title">航路点設定</div>
  </div>
  <!-- 詳細情報 -->
  <v-card-text class="drn_content">
    <div class="drn_content__body">
      <!-- 左カラム：区間・ジャンクション名設定フォーム -->
      <v-sheet class="drn_content__data">
        <div class="jns-section-header">航路名</div>
        <v-text-field
          :model-value="routeName"
          disabled
          density="compact"
          variant="outlined"
          placeholder="航路名を入力"
          class="drn_form__input"
          maxlength="200"
        ></v-text-field>
        <div class="jns-spacer"></div>
        <div class="jns-section-header">航路詳細</div>
        <div class="jns-section-desc">作成したい各航路点と各航路区画の名称を入力してください。</div>
        <div class="detailList">
        <div class="waypoint-list-edit">
          <template v-for="(item, index) in combinedList" :key="'we-' + index">
            <div v-if="index % 2 === 0" class="wl-wp">
              <div class="wl-left">
                <div class="wl-icon-wrap" v-html="sidebarIcon(item.id)"></div>
              </div>
              <v-text-field
                type="input"
                density="compact"
                variant="outlined"
                :placeholder="getPlaceholder(item.type)"
                v-model="item.name"
                class="drn_form__input wl-input"
                maxlength="200"
                @change="handleChangedCorridorDataAdded"
                :disabled="disabledIdxList.includes(index)"
              ></v-text-field>
            </div>
            <div v-else class="wl-sec-edit">
              <div class="wl-left"></div>
            <v-text-field 
              type="input"
              density="compact"
              variant="outlined"
              :placeholder="getPlaceholder(item.type)"
              v-model="item.name"
                class="drn_form__input wl-input"
              maxlength="200"
              @change="handleChangedCorridorDataAdded"
              :disabled="disabledIdxList.includes(index)"
              ></v-text-field>
            </div>
          </template>
        </div>
        </div>
      </v-sheet>      <!-- 右カラム：区間・ジャンクション地図 -->
      <v-sheet rounded="lg" color="default" class="drn_content__map">
        <MapComponent :corridorData="parsedcorridorData" :message="fallToleranceRangeId" class="nameSettingMap" :stepNo="stepNo"/>
      </v-sheet>
    </div>
  </v-card-text>
</template>

<script>
import MapComponent from '@/components/map/showAirwayDetail.vue';

export default {
  components: {
    MapComponent,
  },
  props: ['rangeData', 'stepNo'],
  data() {
    return {
      fallToleranceRangeId: this.rangeData.fallToleranceRangeId, 
      stepNo: this.stepNo,
      disabledIdxList: [],
      routeName: this.rangeData.routeName?.value ?? '',
    };
  },
  computed: {
    corridorList() {
        const corridorData = this.rangeData.corridorData;
        console.log(corridorData);
        return corridorData.value;
    },
    parsedcorridorData() {
      try {
        // corridorListが文字列の場合のみJSON.parseを実行
        if (typeof this.corridorList === 'string') {
          return JSON.parse(this.corridorList);
        }
        return this.corridorList; // corridorListがオブジェクトの場合はそのまま返す
      } catch (error) {
        console.error('Error parsing JSON:', error.message);
        return {}; // エラーが発生した場合は空のオブジェクトを返す
      }
    },
    combinedList() {
      const points = this.parsedcorridorData.airwayJunctions || [];
      const sections = this.parsedcorridorData.airwaySections || [];
      const maxLength = Math.max(points.length, sections.length);
      const combined = [];

      let disableJunctionIdx = 0;
      let disableSectionNameIdx = 1;
      this.disabledIdxList = [];
      for (let i = 0; i < maxLength; i++) {
        if (i < points.length) {
          combined.push({ id: i+1, type: 'c-landMarkNameField', name: points[i].airwayJunctionName });
          if (!points[i].new) {
            // 既存の航路点名は修正不可とする
            this.disabledIdxList.push(disableJunctionIdx);
          }
        }
        if (i < sections.length) {
          combined.push({ id: i+1, type: 'c-sectionNameField', name: sections[i].airwaySectionName });
          if (this.rangeData.baseSectionNames.value.includes(sections[i].airwaySectionName)) {
            // 変更のない区画名は修正不可とする
            this.disabledIdxList.push(disableSectionNameIdx);
          }
        }
        disableJunctionIdx = disableJunctionIdx + 2;
        disableSectionNameIdx = disableSectionNameIdx + 2;
      }
      return combined;
    },
    
  },
  watch: {
    combinedList: {
      handler() {
        this.isFormComplete();
      },
      deep: true
    }
  },
  methods: {
    sidebarIcon(number) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 33.818 33.818">
        <circle cx="16.909" cy="16.909" r="14.909" fill="white" stroke="#2C69FF" stroke-width="4"/>
        <text x="16.909" y="22" text-anchor="middle" font-size="16" font-family="MeiryoUI-Bold, Meiryo UI" font-weight="700" fill="#2C69FF">${number}</text>
      </svg>`;
    },
    isFormComplete() {
    const isComplete = this.combinedList.every(item => {
      return item.name.trim() !== '';
    });
    return isComplete;
    },
    clearInputs() {
      for (let i = 0; i < this.combinedList.length; i++) {
        // 既存の航路点・変更されていない区画名については削除しない
        if (this.disabledIdxList.includes(i)) {
          continue;
        }
        this.combinedList[i].name = ''
      }
      this.$forceUpdate(); // 強制的に再レンダリングをトリガー
      this.isFormComplete(); // isFormComplete を再評価
      this.handleChangedCorridorDataAdded();
    },
    getPlaceholder(type) {
      return type === 'c-landMarkNameField' ? '航路点名を入力' : '航路区間名を入力';
    },
    handleChangedCorridorDataAdded() {
      const updatedCorridorData = {
        ...this.parsedcorridorData,
        airwayJunctions: this.parsedcorridorData.airwayJunctions.map((point, index) => ({
          ...point,
          airwayJunctionName: this.combinedList.filter(item => item.type === 'c-landMarkNameField')[index]?.name ||  ''
        })),
        airwaySections: this.parsedcorridorData.airwaySections.map((section, index) => ({
          ...section,
          airwaySectionName: this.combinedList.filter(item => item.type === 'c-sectionNameField')[index]?.name ||  ''
        }))
      };
      this.$emit('update:changedCorridorData', updatedCorridorData);
    },
  }
};
</script>

<style>
.nameSettingMap {
 height: 700px;
}

#map {
  height: 100%!important;
}

.jns-section-header {
  font-size: 14px;
  font-weight: bold;
  margin: 8px 0 4px 0;
}
 
.jns-spacer {
  height: 20px;
}

.jns-section-desc {
  font-size: 12px;
  color: #555;
  margin-bottom: 8px;
}

.waypoint-list-edit {
  position: relative;
  margin-left: 4px;
}

.waypoint-list-edit::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 34px;
  bottom: 34px;
  width: 14px;
  background: #2C69FF;
}

.waypoint-list-edit::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 34px;
  bottom: 34px;
  width: 8px;
  background: #B1C8FF;
}
 
.wl-wp {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wl-sec {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
}

.wl-sec-edit {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}

.wl-input {
  flex: 1;
  min-width: 0;
}

.wl-wp .wl-input {
  margin-top: 10px;
}

.wl-left {
  width: 24px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.wl-icon-wrap {
  flex-shrink: 0;
  line-height: 0;
  position: relative;
  z-index: 2;
}

.detailList {
  width: 100%;
  height: calc(100vh - 450px);
  overflow: auto;
}

.detailList::-webkit-scrollbar {
  width: 8px;
  background: white;
}

.detailList::-webkit-scrollbar-thumb {
  background-color: #999999;
  border-radius: 5px;
}
</style>


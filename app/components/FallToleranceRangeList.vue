<template>
<div class="drn_main__app">
  <div variant="flat" class="drn_main__content">

    <!-- ヘッダ -->
    <div class="drn_header">
      <div class="drn_header__item">
        <v-card-title class="drn_header__title">最大落下範囲一覧</v-card-title>
      </div>
      <div class="drn_header__action">
        <v-btn
          v-if="viewType == 'listview'"
          variant="outlined"
          rounded="pill"
          class="drn_header__btn drn_header__btn--filter"
          @click="togglePopup"
        >
          <img class="drn_btn__filter" src="/assets/css/img/main/filter-solid.svg" width="15" height="15">
          絞り込み
        </v-btn>
        <v-btn-toggle
          v-model="viewType"
          mandatory
          variant="flat"
          rounded="pill"
          border
          density="comfortable"
          class="drn_toggle drn_toggle--viewtype"
        >
          <v-btn
            value="listview"
            class="drn_toggle__btn"
            @click="setList"
          >
            <img src="/assets/css/img/main/list-solid.svg" width="15" height="15">
          </v-btn>
          <v-btn
            value="mapview"
            class="drn_toggle__btn"
            @click="setMap"
          >
            <img class="drn_toggle__map_btn" src="/assets/css/img/main/map-regular.svg" width="20" height="20">
          </v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- モーダルウィンドウ -->
    <div v-if="showPopup && isListView" class="popup">
      <!-- オプション検索の内容 -->
      <div class="option-container">
        <div class="option-item">
          <div class="e-fieldLabel-option">申請日時</div>
          <ul class="horizontal-list">
            <li>
              <input type="date" v-model="startDate" class="e-textField-date-option" />
            </li>
            <li>
              <input type="date" v-model="endDate" class="e-textField-date-option" />
            </li>
          </ul>
        </div>
      </div>
      <div class="option-container">
        <div class="option-item">
          <div class="e-fieldLabel-select">エリア</div>
          <ul class="horizontal-list">
            <li>
              <select v-model="area" class="e-textField-select">
                <option value="" selected hidden>-- 地域名称 --</option>
                <option v-for="item in areaitems" :key="item" :value="item">{{ item }}</option>
              </select>
            </li>
          </ul>
        </div>
      </div>
      <div class="item-center">
        <input type="submit" class="e-button-search" value="検索" @click="performSearch" />
      </div>
      <div class="item-center">
        <a style="color: #333333; text-decoration: none;" @click="reset">検索条件をリセットする</a>
      </div>
    </div>

    <!-- テーブル -->
    <v-card-text v-if="viewType == 'listview'" class="drn_content">
      <div class="drn_content__body">
      <v-sheet class="drn_content__data">
      <div class="drn_list">
      <div class="drn_list__body">
        <v-data-table
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="filteredRoutes"
          item-value="fid"
          item-key="fid"
          fixed-header
          fixed-footer
          density="comfortable"
          class="drn_list__table"
          @update:selected-items="selectRoute"
          :items-per-page-options="[5, 10, 15, 20]"
        >
          <template v-slot:body="{ items }">
            <tr
              v-for="(item, index) in items"
              :key="item.fid"
              :class="{'drn_table__selected': selectedFid === item.fid }"
              @click="selectRoute(item.fid)"
            >
              <td :class="{'drn_table__selected_first_td': selectedFid === item.fid }">{{ item.fid }}</td>
              <td>{{ item.reservationStatus }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.areaName }}</td>
              <td>{{ item.coordinates }}</td>
              <td>{{ item.application_date }}</td>
              <td>
                <router-link
                  :to="{ 
                    path: '/fallToleranceRange/detail',
                    query: {
                      fid: item.fid,
                      name: item.name,
                      application_date: item.application_date,
                      area: item.areaName,
                      typeId: item.typeId,
                      regionId: item.regionId
                    } 
                  }"
                >
                  <img class="drn_table__detail_icon" src="/assets/css/img/main/circle-info-solid.svg" width="20" height="20">  
                </router-link>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
      </div>
      </v-sheet>
      </div>
    </v-card-text>

    <!-- 地図表示 -->
    <v-card-text v-if="viewType == 'mapview'" class="drn_content">
      <div class="drn_content__body">
      <v-sheet class="drn_content__data">
        <MapComponent
        v-if="filteredRangeData"
          :rangeData="filteredRangeData"
          :selectedRouteFid="selectedFid"
          :key="selectedFid"
        />
      </v-sheet>
      </div>
    </v-card-text>
  </div>
</div>
</template>

<script>
import MapComponent from "~/components/map/selectFallToleranceRange.vue";
export default {
props: {
  filter: {
    type: Object,
    required: false
  },
},
components: {
  MapComponent,
},
data() {
  return {
    headers: [
      { title: '最大落下範囲ID', align: 'start', key: 'fid', sortable: true },
      { title: '申請状況', align: 'start', key: 'reservationStatus', sortable: true },
      { title: '最大落下範囲名', align: 'start', key: 'name', sortable: true },
      { title: 'エリア', align: 'start', key: 'areaName', sortable: true },
      { title: '航路数', align: 'start', key: 'coordinatesLength', sortable: true },
      { title: '申請・更新日', align: 'start', key: 'application_date', sortable: true },
      { title: '詳細', align: 'start', key: 'details', sortable: false },
    ],
    routes: [],
    selectedFid: null,
    itemsPerPage: 20,
    showPopup: false,
    purposes: ["物資運搬","送電線点検","河川監視","山岳監視","航空撮影","その他"],
    startDate: '',
    endDate: '',
    area: '',
    areaitems: [],
    filteredRoutes: [],
    rangeData: null,
    filteredRangeData: null,
    airwayData: null,
    viewType: 'listview',
  };
},
computed: {
  isListView() {
    if (this.viewType == 'listview') {
      return true;
    } else {
      return false;
    }
  }
},
methods: {
  selectRoute(fid) {
    this.selectedFid = this.selectedFid === fid ? null: fid;
  },
  togglePopup() {
      this.showPopup = !this.showPopup;
  },
  performSearch() {
    let start = new Date("1970-01-01");
    if(this.startDate !== ''){
      start = new Date(useDateStringLocaltoUTC(this.startDate));
    }
    let end = new Date("9999-12-31");
    if(this.endDate !== ''){
      end = new Date(useDateStringLocaltoUTC(this.endDate));
    }
    this.filteredRoutes = this.routes.filter(item => {
      const itemapplication_date = new Date(item.application_date);
      const isapplicationMatch = !start || !end || (start.getFullYear() <= itemapplication_date.getFullYear() &&
                                                    start.getMonth() <= itemapplication_date.getMonth() &&   
                                                    start.getDate() <= itemapplication_date.getDate() &&                                           
                                                    end.getFullYear() >= itemapplication_date.getFullYear() && 
                                                    end.getMonth() >= itemapplication_date.getMonth() && 
                                                    end.getDate() >= itemapplication_date.getDate());

      const isAreaMatch =!this.area || ( this.area === item.areaName);

      this.showPopup = !this.showPopup;

      return isapplicationMatch && isAreaMatch;
    });
  },
  reset() {
    this.purposes = ["物資運搬","送電線点検","河川監視","山岳監視","航空撮影","その他"];
    this.startDate = '';
    this.endDate = '';
    this.area = '';
  },
  formatDate(isoDate) {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // 月は0から始まるので+1
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}/${month}/${day}`;
  },
  setList() {
    this.viewType = 'listview';
  },
  setMap() {
    this.viewType = 'mapview';
  }
},
created() {
  this.filteredRoutes = this.routes;
},
async mounted() {  
  const rangeRes = await $fetch('/api/airway/max-fall-range', { 
    method: 'GET',
    query: { businessNumber: localStorage.getItem('uasl:user:parentOperatorId') }
  });
  console.log(rangeRes);
  if (rangeRes.status !== 200) {
    console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
    this.rangeData = null;
    return;
  } else {
    this.rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);
  }

  this.filteredRangeData = this.rangeData;
  // オプション検索で使用する地域一覧を作成
  this.areaitems = [];
  if (this.rangeData && this.rangeData.fallToleranceRanges) {
    for(let i=0; i<this.rangeData.fallToleranceRanges.length; i++) {
      const is_exist_areaName = this.areaitems.includes(this.rangeData.fallToleranceRanges[i].areaName);
      if (is_exist_areaName == false) {
        this.areaitems.push(this.rangeData.fallToleranceRanges[i].areaName);
      }
    }
  }

  // /operator廃止につき事業者一覧取得は展進しない

  const uaslRes = await $fetch('/api/airway/uasl', { 
    method: 'GET',
    query: { all: true }
  });
  if (uaslRes.status !== 200) {
    console.error(`error: get uasl info {status: ${uaslRes.status}}.`);
    this.airwayData = {};
    return;
  }
  const uaslResData = utils.convertUaslToAirway(uaslRes.data);
  this.airwayData = useAirwayConvertConnectionOrder(uaslResData);
  if (this.rangeData && this.rangeData.fallToleranceRanges) {
    for (let i = 0; i < this.rangeData.fallToleranceRanges.length; i++) {
      let item = this.rangeData.fallToleranceRanges[i];
      let route = {
        fid: item.fallToleranceRangeId, 
        reservationStatus: '承認済',
        name: item.name,
        areaName: item.areaName,
        coordinatesLength: item.airwayIdUse.length,
        coordinates: item.airwayIdUse.length + '航路',
        typeId: item.typeId,
        regionId: item.regionId,
        application_date: this.formatDate(item.createdAt),
        update_date: this.formatDate(item.updatedAt),
      }
      this.routes.push(route);
    }
  }
  this.filteredRoutes = this.routes;
},
};
</script>

<style scoped>

/* モーダルウィンドウのスタイル */
.popup {
  position: absolute;
  left: 40dvh;
  top: 80px; /* 画像ボタンの位置に合わせて調整 */
  width: 1180px;
  height: 231px;
  background-color: #fefefe;
  border: 1px solid #888;
  padding-top: 21px;
  padding-left: 55px;
  padding-right: 55px;
  z-index: 10000;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
}

.horizontal-list {
  list-style: none; /* デフォルトのリストスタイルを削除 */
  padding: 0; 
  margin: 0; 
}

.horizontal-list li {
  display: inline-block; 
  margin-right: 10px;
}

.option-container {
  display: flex; 
}

.option-item {
  margin: 5px;
}

.item-center {
  display: flex;
  justify-content: center; 
}

.e-textField-date-option{
  width: 170px;
  height: 25px!important;
  border: 1px solid var(--line_-999999);
}

.e-textField-select{
  width: 250px;
  height: 25px!important;
  border: 1px solid var(--line_-999999);
  padding-top: 5px;
  padding-bottom: 6px;
  padding-left: 10px;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

.e-button-search{
  width: 98px;
  height: 25px;
  background: var(--txt_-333333) 0% 0% no-repeat padding-box;
  border: 1px solid var(--line_-999999);
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--unnamed-color-ffffff);
  text-align: center;
  margin-top: 15px;
  margin-bottom: 10px;
}

.e-fieldLabel-option {
  margin-bottom: 0.5rem;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

.v-table__wrapper table tbody tr td {
  vertical-align: middle;
}

</style>

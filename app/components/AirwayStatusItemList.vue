

<template>
  <!-- メインコンテンツ -->
  
  <div class="drn_main__app">
  <div variant="flat" class="drn_main__content">
    <!-- ヘッダ -->
    <div class="drn_header">
      <div class="drn_header__item">
        <v-card-title class="drn_header__title">運航状況一覧</v-card-title>
      </div>
      <div class="drn_header__action">
        <v-btn
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
          <a :href="selectedAirwayId ? `/airwayStatus/map?airwayId=${selectedAirwayId}` : '/airwayStatus/map'">
            <v-btn
              value="mapview"
              class="drn_toggle__btn"
            >
              <img class="drn_toggle__map_btn" src="/assets/css/img/main/map-regular.svg" width="20" height="20">
            </v-btn>
          </a>
        </v-btn-toggle>
      </div>
    </div>

    <!-- モーダルウィンドウ -->
    <div v-if="showPopup" class="popup">
      <!-- オプション検索の内容 -->
      <div class="option-container">
        <div class="option-item">
          <div class="e-fieldLabel-option">飛行目的</div>
          <ul class="horizontal-list">
            <li class="check-porpose">
              <label><input type="checkbox" id="物資運搬" v-model="purposes" value="物資運搬" />物資運搬</label>
            </li>
            <li class="check-porpose">
              <label><input type="checkbox" id="送電線点検" v-model="purposes" value="送電線点検" />送電線点検</label>
            </li>
            <li class="check-porpose">
              <label><input type="checkbox" id="河川監視" v-model="purposes" value="河川監視" />河川監視</label>
            </li>
            <li class="check-porpose">
              <label><input type="checkbox" id="山岳監視" v-model="purposes" value="山岳監視" />山岳監視</label>
            </li>
            <li class="check-porpose">
              <label><input type="checkbox" id="航空撮影" v-model="purposes" value="航空撮影" />航空撮影</label>
            </li>
            <li class="check-porpose">
              <label><input type="checkbox" id="その他" v-model="purposes" value="その他" />その他</label>
            </li>
          </ul>
        </div>
        <div class="option-item">
          <div class="e-fieldLabel-option">航路出発～到着日時</div>
          <ul class="horizontal-list">
            <li>
              <input type="datetime-local" v-model="startDate" class="e-textField-date-option" />
            </li>
            ～
            <li>
              <input type="datetime-local" v-model="endDate" class="e-textField-date-option" style="margin-left: 0.5rem;" />
            </li>
          </ul>
        </div>
      </div>
      <div class="option-container">
        <div class="option-item">
          <div class="e-fieldLabel-option">事業所・会社名</div>
          <ul class="horizontal-list">
            <li>
              <select v-model="companyName" class="e-textField-select">
                <option value="" selected hidden>-- 事業所・会社名称 --</option>
                <option v-for="item in companyNameItems" :key="item" :value="item">{{ item }}</option>
              </select>
            </li>
          </ul>
        </div>
        <div class="option-item">
          <div class="e-fieldLabel-select">エリア</div>
          <ul class="horizontal-list">
            <li>
              <select v-model="area" class="e-textField-select">
                <option value="" selected hidden>-- エリア --</option>
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
    

    <!-- スピナー：reservationLoading 中 -->
    <div v-if="reservationLoading" class="drn_spinner__area">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="drn_spinner__text">運航状況データを読み込み中…</p>
    </div>

    <!-- 予約一覧テーブル -->
    <v-card-text v-if="!reservationLoading" class="drn_content">
      <div class="drn_content__body">
      <v-sheet class="drn_content__data">
      <div class="drn_list">
      <div class="drn_list__body">
        <!-- テーブル -->
        <div class="drn_native_table_wrap">
          <table class="drn_native_table">
            <thead>
              <tr>
                <th
                  v-for="h in headers"
                  :key="h.key"
                  class="drn_native_th"
                  @click="setSortKey(h.key)"
                >
                  {{ h.title }}
                  <span v-if="sortKey === h.key">{{ sortAsc ? '▲' : '▼' }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedRoutes"
                :key="item.id"
                :class="{ 'drn_table__selected': selectedReservationId === item.id }"
                @click="selectRoute(item.id, item.airwayId)"
              >
                <td :class="{ 'drn_table__selected_first_td': selectedReservationId === item.id }" style="text-align:center">
                  <div :class="{ 'change-color-airwaystatus': item.reservationStatus === '運航中', 'change-color-evaluation-airwaystatus': item.reservationStatus !== '運航中' }">
                    {{ item.reservationStatus }}
                  </div>
                </td>
                <td>{{ item.reservationNumber }}</td>
                <td>{{ item.dateRange }}</td>
                <td>{{ item.route }}</td>
                <td>{{ item.section }}</td>
                <td>{{ item.reservationDay }}</td>
                <td>{{ item.updateDay }}</td>
              </tr>
              <tr v-if="pagedRoutes.length === 0">
                <td :colspan="headers.length" style="text-align:center; padding: 16px;">データがありません</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- ページネーション -->
        <div class="drn_pagination">
          <div class="drn_pagination__per_page">
            <span>表示件数:</span>
            <select v-model.number="itemsPerPage" @change="page = 1">
              <option v-for="n in [5, 10, 20, 50]" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
          <div class="drn_pagination__info">{{ paginationInfo }}</div>
          <div class="drn_pagination__controls">
            <button class="drn_pager_btn" :disabled="page === 1" @click="page = 1">«</button>
            <button class="drn_pager_btn" :disabled="page === 1" @click="page--">‹</button>
            <button
              v-for="n in pageNumbers"
              :key="n"
              class="drn_pager_btn"
              :class="{ 'drn_pager_btn--active': page === n }"
              @click="page = n"
            >{{ n }}</button>
            <button class="drn_pager_btn" :disabled="page === totalPages" @click="page++">›</button>
            <button class="drn_pager_btn" :disabled="page === totalPages" @click="page = totalPages">»</button>
          </div>
        </div>
      </div>
      </div>
      </v-sheet>
      </div>
    </v-card-text>
  </div>
  </div>
</template>

<script>

export default {
  props: {
    reservationData: {
      type: Object,
      required: true
    },
    airwayData: {
      type: Object,
      required: false,
      default: () => ({ airway: { airways: [] } })
    },
    airwayDataLoading: {
      type: Boolean,
      default: true
    },
    reservationLoading: {
      type: Boolean,
      default: true
    },
    ownDataReady: {
      type: Boolean,
      default: false
    },
  },
  data() {
    return {
      headers: [
        { title: '運行状況', align: 'start', key: 'reservationStatus', sortable: true },
        { title: '予約番号', align: 'start', key: 'reservationNumber', sortable: true },
        { title: '航路出発～到着日時', align: 'start', key: 'dateRange', sortable: true },
        { title: '航路', align: 'start', key: 'route', sortable: true },
        { title: '区間', align: 'start', key: 'section', sortable: true },
        { title: '予約日', align: 'start', key: 'reservationDay', sortable: true },
        { title: '通知・更新', align: 'start', key: 'updateDay', sortable: true },
      ],
      selectedReservationId: null,
      selectedAirwayId: null,
      itemsPerPage: 20,
      sortKey: '',
      sortAsc: true,
      page: 1,
      showPopup: false,
      purposes: ["物資運搬","送電線点検","河川監視","山岳監視","航空撮影","その他"],
      startDate: '',
      endDate: '',
      area: '',
      areaitems: [],
      companyName: '',
      companyNameItems: [],
      filteredRoutes: [],
      falltrangeData: null,
      operatorData: null,
      cookie_role: null,
      role: null, 
      relationship_airwayIds: [],
      reservation_airwayIds: [],
      currentItems: [],
      viewType: 'listview',
    };
  },
  computed: {
    sortedRoutes() {
      if (!this.sortKey) return this.filteredRoutes
      const key = this.sortKey
      const asc = this.sortAsc
      return [...this.filteredRoutes].sort((a, b) => {
        const av = a[key] ?? ''
        const bv = b[key] ?? ''
        if (av < bv) return asc ? -1 : 1
        if (av > bv) return asc ? 1 : -1
        return 0
      })
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.sortedRoutes.length / this.itemsPerPage))
    },
    pagedRoutes() {
      const start = (this.page - 1) * this.itemsPerPage
      return this.sortedRoutes.slice(start, start + this.itemsPerPage)
    },
    paginationInfo() {
      const total = this.sortedRoutes.length
      if (total === 0) return '0 件'
      const start = (this.page - 1) * this.itemsPerPage + 1
      const end = Math.min(this.page * this.itemsPerPage, total)
      return `${start} - ${end} / ${total} 件`
    },
    pageNumbers() {
      const total = this.totalPages
      const cur = this.page
      const delta = 2
      const pages = []
      for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
        pages.push(i)
      }
      return pages
    },
  },
  watch: {
    async airwayData(newVal) {
      if (!newVal?.airway?.airways) return;
      this.filteredRoutes = await this.buildRoutes();
    },
    async airwayDataLoading(newVal) {
      if (!newVal) {
        this.filteredRoutes = await this.buildRoutes();
      }
    },
    async reservationData(newVal) {
      if (!newVal?.result?.length) return;
      this.filteredRoutes = await this.buildRoutes();
    },
  },
  methods: {
    async buildRoutes() {
      if (!this.reservationData?.result?.length) return [];
      const reservationList = [];

      // 最大許容落下範囲情報取得
      const rangeRes = await $fetch('/api/airway/max-fall-range', { 
        method: 'GET',
        query: { businessNumber: useRuntimeConfig().public.businessNumber }
      });
      if (rangeRes.status !== 200) {
        console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
        this.falltrangeData = null;
        return;
      }
      this.falltrangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);

      // 地域一覧を取得
      const areajsonUrl = `/api/getAreaJsonData`;
      const areadata = await $fetch(areajsonUrl);
      if (areadata.data != undefined) {
        // オプション検索で使用する地域一覧を作成
        this.areaitems = [];
        for(let i=0; i<areadata.data.areas.length; i++) {
          const is_exist_areaName = this.areaitems.includes(areadata.data.areas[i].name);
          if (is_exist_areaName == false) {
            this.areaitems.push(areadata.data.areas[i].name);
          }
        }
      } else {
        return;
      }

      const LOADING = 'データ取得中';
      let id = 0;
      if(!("result" in  this.reservationData)){
        return reservationList;
      }
      if (this.reservationData['result'] != undefined) {
        this.reservationData['result'].forEach((reservation) => {
          // 未来のデータチェック
          let isDateCheck = false;
          const now_date = new Date();
          const Departure_date = new Date(useDateString1(reservation['airwaySections'][0]['startAt']));
          const lastAirwaySection = reservation['airwaySections'][reservation['airwaySections'].length - 1];
          const Arrival_date = new Date(useDateString1(lastAirwaySection['endAt']));
          const rawReservationStatus = reservation['status'];
          // RESERVED かつ現在日時が予約開始〜到着（最終区画）の範囲内であれば表示
          isDateCheck = rawReservationStatus === 'RESERVED' && Departure_date <= now_date && Arrival_date >= now_date;
          if (isDateCheck == false) {
            // 未来のデータも表示から除外
            return;
          }
          let airwaySections = []
          for(let i=0; i<reservation['airwaySections'].length; i++){
            airwaySections.push(reservation['airwaySections'][i]['airwaySectionId']);
          }
          let airwayIds = []
          airwaySections.forEach((airwaySectionId) => {
            airwayIds.push(useAirwayGetAirwayIdFromSectionId(this.airwayData, airwaySectionId)) // 予約に含まれる航路区画IDをもとに航路IDを特定
          });
          let route = []
          airwayIds.forEach((airwayId) => {
            const rName = useAirwayGetAirwayNameFromAirwayId(this.airwayData, airwayId);
            route.push(this.airwayDataLoading && rName === 'Not found.' ? LOADING : rName)
          })
          // 指定航路区画の航路点情報取得
          const getAirwayJunctions = (airwaySectionId) => {
            const [junctions] =
              this.airwayData.airway.airways
                    .filter(airway => airway.airwaySections.some(section => section.airwaySectionId == airwaySectionId))
                    .map(airway => (
                        airway.airwayJunctions
                          .filter(junction => airway.airwaySections.find(section => section.airwaySectionId == airwaySectionId)
                          .airwayJunctionIds.includes(junction.airwayJunctionId)) )
                    );
            return junctions;
          };
          let section = "Not found"
          const sectionCount = reservation?.airwaySections?.length ?? 0;
          if (sectionCount == 1) {
            const junctions = getAirwayJunctions(reservation.airwaySections[0].airwaySectionId);
            section = junctions ? junctions.map(j => j.name).join(' ~ ') : "Not found";
          } else if (sectionCount > 1) {
            const getJunctionName = (isStart) => {
              const firstIndex = isStart ? 0 : reservation.airwaySections.length - 1;
              const secondIndex = firstIndex + (isStart ? 1 : -1);
              const firstJunctions = getAirwayJunctions(reservation.airwaySections[firstIndex].airwaySectionId);
              const secondJunctions = getAirwayJunctions(reservation.airwaySections[secondIndex].airwaySectionId);
              if (!firstJunctions || !secondJunctions) return null;
              const uniqueJunctions = firstJunctions.filter(j =>
                !secondJunctions.map(m => m?.airwayJunctionId).includes(j.airwayJunctionId)
              );
              if (uniqueJunctions.length == 1) {
                return uniqueJunctions[0]?.name;
              } else {
                return firstJunctions[+!isStart]?.name;
              }
            };
            section = (getJunctionName(true) ?? '') + ' ~ ' + (getJunctionName(false) ?? '');
          }
          // airwayData 未取得・ロード中の場合は "データ取得中" を表示
          const isSectionEmpty = section === 'Not found' || section.includes('Not found') || !section.replace(/[\s~]/g, '');
          if (this.airwayDataLoading && isSectionEmpty) {
            section = LOADING;
          }
          let element = {
            id: reservation['airwayReservationId'],
            airwayId: airwayIds[0],
            // 適合性確認改修 start
            evaluationResults: reservation['evaluationResults'],
            reservationStatus: reservation['evaluationResults'] ? this.convertReservationStatus(rawReservationStatus) : reservation['evaluationStatus'],
            // 適合性確認改修 end
            rawReservationStatus: rawReservationStatus,
            dateRange: useDateString1(reservation['airwaySections'][0]['startAt']) + ' ~ ' + useDateString1(lastAirwaySection['endAt']),
            reservationNumber: reservation['airwayReservationId'],
            route: [...new Set(route.map(s => s.trim()))].join(", "),
            section: section,
            Departure: useDateString1(reservation['airwaySections'][0]['startAt']),
            Arrival: useDateString1(lastAirwaySection['endAt']),
            rawStartDay: reservation['airwaySections'][0]['startAt'],
            rawEndDay: lastAirwaySection['endAt'],
            reservationDay: useDateString2(reservation['reservedAt']),
            updateDay: useDateString2(reservation['updatedAt']),
            name: [...new Set(route.map(s => s.trim()))].join(", "),
            area: getareaName(this.falltrangeData, airwayIds[0]),
            purpose: useAirwayGetPurposeFromAirwayId(this.airwayData, airwayIds[0]),
            companyName: getcompanyName(this.operatorData, reservation['operatorId']),
            airwaySectionId: airwaySections
          };
          reservationList.push(element);
          id++;
        });
      } else {
        console.error(`this.reservationData['result'] undefined(reservationList: ${reservationList})`);
      }
      return reservationList;
    },
    convertReservationStatus(status) {
      switch(status) {
        case 'RESERVED':
          return '運航中';
        case 'CANCELED':
          return 'キャンセル済み';
        case 'RESCINDED':
          return '撤回済み';
        default:
          return '未定義'
      }
    },
    checkLocalStorage() {
      const rawData = localStorage.getItem("airwayEvaluationDB");
      if (!rawData) {
        return;
      }
    
      let notifications;
      try {
        notifications = JSON.parse(rawData);
      } catch (error) {
        console.error("Failed to parse noticeDB:", error);
        return;
      }

      // 同じ reservationId の中で 最新 receiveTime を選別
      const newestDataMap = {}; 

      notifications.forEach(item => {
          newestDataMap[item.reservationId] = item;
      });

      // filteredRoutes の各行について、reservationId が一致する最新 receiveTime のデータがあれば上書き
      this.filteredRoutes.forEach(route => {
        // 適合性確認改修 start
        const matched = newestDataMap[route.id];
        if (matched) {
          route.rawReservationStatus = matched.status;
          route.evaluationResults = matched.evaluationResults;
          // reservationStatus を notifyType に更新
          if(matched.evaluationResults === true){
            route.reservationStatus = '運航中'
          }else{
            route.reservationStatus = matched.type;
          }
          
        }
        // 適合性確認改修 end
      });
      //反映し終わったら空にしておく
      localStorage.setItem("airwayEvaluationDB",[]);
    },
    selectRoute(id, airwayId) {
      if (this.selectedReservationId === id) {
        this.selectedReservationId = null;
        this.selectedAirwayId = null;
      } else {
        this.selectedReservationId = id;
        this.selectedAirwayId = airwayId ?? null;
      }
    },
    setSortKey(key) {
      if (this.sortKey === key) {
        this.sortAsc = !this.sortAsc;
      } else {
        this.sortKey = key;
        this.sortAsc = true;
      }
    },
    setList() {
      this.viewType = 'listview';
    },
    setMap() {
      this.viewType = 'mapview';
    },
    togglePopup() {
        this.showPopup = !this.showPopup;
    },
    async performSearch() {
      let start = new Date("1970-01-01");
      if(this.startDate !== ''){
        start = new Date(useDateStringLocaltoUTC(this.startDate));
      }
      let end = new Date("9999-12-31");
      if(this.endDate !== ''){
        end = new Date(useDateStringLocaltoUTC(this.endDate));
      }
      const routes_filter = await this.buildRoutes();
      this.filteredRoutes = routes_filter.filter(item => {
        const itemDeparture = new Date(item.Departure);
        const itemArrival = new Date(item.Arrival);
        
        const isPurposeMatch = !this.purposes.length || this.purposes.some(purpose => item.purpose.includes(purpose));

        // 出発日時
        const isStartMatch = !start || (start <= itemDeparture && end >= itemDeparture);
        // 到着日時
        const isEndMatch = !end || (start <= itemArrival && end >= itemArrival);
        let isDateMatch = false;
        if (isStartMatch == true || isEndMatch == true) {
          // 開始または終了いずれかが範囲内なら対象とする。
          isDateMatch = true;
        }

        const isCompanyNameMatch =!this.companyName || ( this.companyName === item.companyName);
        const isAreaMatch =!this.area || ( this.area === item.area);

        this.showPopup = !this.showPopup;

        const isView = isPurposeMatch && isDateMatch && isCompanyNameMatch && isAreaMatch;
        return isView;
      });
    },
    async reset() {
      this.purposes = ["物資運搬","送電線点検","河川監視","山岳監視","航空撮影","その他"];
      this.startDate = '';
      this.endDate = '';
      this.companyName = '';
      this.area = '';
    },
    async onUpdateCurrentItems(items) {
      this.currentItems = items;
      console.log(this.currentItems);

      for (let i = 0; i < this.currentItems.length; i++) {
        // キャンセルもしくは撤回済みの予約については中止表示
        if (this.currentItems[i].raw.rawReservationStatus == 'CANCELED' || this.currentItems[i].raw.rawReservationStatus == 'RESCINDED') {
          this.currentItems[i].raw.reservationStatus = '　中止　'
          continue;
        }
      }
    }
  },
  async created() {
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1","2","3"];
      this.cookie_role = await roleVerification(ownpage_role);
      if (Object.keys(this.cookie_role).length == 0) {
        console.log(`airwayReservation get role error.`);
        return;
      }
      switch (this.cookie_role.virtual_role) {
        case "1":
          this.role = 1;  // 航路運営者
          break;
        case "2":
          this.role = 2;  // 運航事業者
          break;
        case "3":
          this.role = 3; // 関係者
          break;
        default:
          this.role = null;
          break;
      }
    }

    // 事業者一覧取得
    // const miscApiBaseUrl = useRuntimeConfig().public.miscApiBaseUrl;
    // const operatorUrl = `${miscApiBaseUrl}/operator`;
    // const operatorRes = await axios_get(operatorUrl);
    // if (operatorRes.status === 200 && operatorRes.data != undefined) {
    if (false) {
      this.operatorData = {};
      this.operatorData = operatorRes.data;
      // オプション検索で使用する事業所・会社名一覧を作成
      this.companyNameItems = [];
      for(let i=0; i<this.operatorData.operatorList.length; i++) {
        const is_exist_companyName = this.companyNameItems.includes(this.operatorData.operatorList[i].operatorName);
        if (is_exist_companyName == false) {
          this.companyNameItems.push(this.operatorData.operatorList[i].operatorName);
        }
      }
    } else {
      console.error(`error: get operator info.`);
      // operator API 失敗でも処理を継続（companyNameItems は空のまま）
    }

    // ユーザが関係者である場合、関係のあるopreratorIdでフィルタリング
    if (this.role == 3) {
      // 関連のある航路IDを取得
      this.relationship_airwayIds = [];
      if (this.operatorData != undefined ) {
        for(let i=0; i<this.operatorData.operatorList.length; i++) {
          if (this.operatorData.operatorList[i].operatorId == this.cookie_role.operatorId) {
            for (let j=0; j<this.operatorData.operatorList[i].linkAirwayList.length; j++) {
              this.relationship_airwayIds.push(this.operatorData.operatorList[i].linkAirwayList[j]);
            }
          }
        }
      }
      // 予約情報に存在する関連のある航路区画(=予約した航路ID)を取得し、関連のある航路ID群に含まれていれば
      // その航路IDを取得
      let reservation_airwayId = null;
      this.reservation_airwayIds = [];
      for (let i=0; i<this.reservationData['result'].length; i++) {
        reservation_airwayId = await useAirwayGetAirwayIdFromSectionId(this.airwayData, this.reservationData['result'][i].airwaySections[0].airwaySectionId);
        if (this.relationship_airwayIds.includes(reservation_airwayId)) {
          this.reservation_airwayIds.push(reservation_airwayId);
        }
      }
      console.log(`reservation_airwayIds: ${this.reservation_airwayIds}`);
    }
    this.filteredRoutes = await this.buildRoutes();
  },
  mounted() {
    // 10秒ごとにローカルストレージをチェックする
    this.timer = setInterval(() => {
      this.checkLocalStorage();
    }, 10000);
  },
  unmounted() {
    // コンポーネントが破棄される際にタイマー停止
    clearInterval(this.timer);
  },
};


</script>

<style>

/* コンポーネント全高フィル（b-pageContentHasNavigation--fill 使用時） */
.b-pageContentHasNavigation--fill .drn_main__app {
  height: 100%;
  min-height: 0;
}
.drn_main__app .drn_content__data {
  overflow: hidden;
}
.drn_main__app .drn_list__body {
  display: flex;
  flex-direction: column;
}

/* ネイティブテーブル */
.drn_native_table_wrap {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
  flex: 1;
  min-height: 0;
}
.drn_native_table {
  width: 100%;
  border-collapse: collapse;
}
.drn_native_th {
  text-align: left;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 2px solid #ddd;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  position: sticky;
  top: 0;
  z-index: 2;
}
.drn_native_th:hover {
  background: #f0f0f0;
}
.drn_native_table tbody tr td {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
.drn_native_table tbody tr:hover {
  background: #fafafa;
}
/* ページネーション */
.drn_pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 6px 8px;
  margin-top: 0;
  flex-wrap: wrap;
  flex-shrink: 0;
  background: #ffffff;
  z-index: 1;
  border-top: 1px solid #e0e0e0;
}
.drn_pagination__per_page {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.drn_pagination__per_page select {
  border: 1px solid #999;
  padding: 2px 4px;
  border-radius: 3px;
}
.drn_pagination__info {
  font-size: 13px;
  color: #555;
}
.drn_pagination__controls {
  display: flex;
  gap: 4px;
}
.drn_pager_btn {
  min-width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  padding: 0 6px;
}
.drn_pager_btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.drn_pager_btn--active {
  background: #333;
  color: #fff;
  border-color: #333;
}

/* モーダルウィンドウのスタイル */
.popup {
  position: absolute;
  top: 165px; /* 画像ボタンの位置に合わせて調整 */
  left: 20px; /* 画像ボタンの位置に合わせて調整 */
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

.check-porpose {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
  padding-right: 10px;
}

.e-fieldLabel-option {
  margin-bottom: 0.5rem;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

/* チェックボックスの塗りつぶしの色を変更 */
input[type="checkbox"] {
    accent-color: var(--unnamed-color-ffffff) 0% 0% no-repeat padding-box; /* 塗りつぶしの色を変更 */
    border: 1px solid var(--line_-999999);
    width: 16px; 
    height: 16px; 
    border-radius: 0; 
}

/* チェックマークの色を変更 */
input[type="checkbox"]:checked::before {
  accent-color: var(--unnamed-color-ffffff) 0% 0% no-repeat padding-box; /* 塗りつぶしの色を変更 */   
    color: 2px solid var(--txt_-333333); /* チェックマークの色を変更 */
}

.header {
padding-top: 1rem;
padding-bottom: 1rem;
}

.v-table__wrapper table thead tr th {
position: relative;
padding: 0.3rem;
text-align: left; 
background-color: #FFFFFF;
border-bottom: 1px solid ;
line-height: 1.5;
color: #000; /* ヘッダー文字色を黒に設定 */
vertical-align: middle; 
}

.v-table__wrapper table tbody tr td {
  vertical-align: middle;
}

.v-table--density-default {
  --v-table-header-height: 35px!important;
  --v-table-row-height: 40px!important;
}

.v-data-table-footer__items-per-page {
  display: none!important;
}

th:not(:first-child) {
  position: relative;

  &:before {
    content: "";
    width: 1px;
    height: 1rem;
    display: block;
    background-color: #000000;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    margin: auto;
  }
}

.selected {
background-color: black!important;
color: white!important;
}


#dummyImageRoute {
display: block;
width: 100%;
height: 100%;
background-image: url("~/assets/css/img/dummyImg/reservedFlightRoute.png");
background-repeat: no-repeat;
background-size: 100%;
}


.v-data-table-footer__items-per-page {
  display: none!important;
}

.v-table.v-table--has-top.v-table--has-bottom.v-theme--light.v-table--density-default.v-data-table.elevation-1 {
  border: 1px solid #999999!important;
}

.change-color-airwaystatus {
  color: rgb(44, 105, 255);
  background: rgb(211, 225, 254);
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.change-color-evaluation-airwaystatus {
  color: rgb(216, 24, 129);
  background: rgb(251, 223, 239);
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* スピナー */
.drn_spinner__area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 16px;
}
.drn_spinner__text {
  font-size: 14px;
  color: #666;
  margin: 0;
}
</style>

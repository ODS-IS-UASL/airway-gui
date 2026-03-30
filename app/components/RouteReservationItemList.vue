<template>
<div class="drn_main__app">
  <div variant="flat" class="drn_main__content">
    <!-- ヘッダ -->
    <div class="drn_header">
      <div class="drn_header__item">
        <v-card-title class="drn_header__title">航路予約一覧</v-card-title>
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
        <!-- オプション検索の内容 -->
      <div class="option-container">
        <div class="option-item">
          <div class="e-fieldLabel-option">飛行目的</div>
          <ul class="horizontal-list">
              <li class="check-porpose">
                <label><input type="checkbox" id="物資運搬" v-model="purposes" value="物資運搬"/>物資運搬</label>
              </li>
              <li class="check-porpose">
                <label><input type="checkbox" id="送電線点検" v-model="purposes" value="送電線点検"/>送電線点検</label>
              </li>
              <li class="check-porpose">
                <label><input type="checkbox" id="河川監視" v-model="purposes" value="河川監視"/>河川監視</label>
              </li>
              <li class="check-porpose">
                <label><input type="checkbox" id="山岳監視" v-model="purposes" value="山岳監視"/>山岳監視</label>
              </li>
              <li class="check-porpose">
                <label><input type="checkbox" id="航空撮影" v-model="purposes" value="航空撮影"/>航空撮影</label>
              </li>
              <li class="check-porpose">
                <label><input type="checkbox" id="その他" v-model="purposes" value="その他"/>その他</label>
              </li>
            </ul>
          </div>
        <div class="option-item">
          <div class="e-fieldLabel-option">航路発着日時</div>
          <ul class="horizontal-list">
              <li>
                <input type="datetime-local" v-model="startDate" class="e-textField-date-option" />
              </li>
              <li>
                <input type="datetime-local" v-model="endDate" class="e-textField-date-option" />
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

    <!-- スピナー：reservationLoading 中 -->
    <div v-if="reservationLoading" class="drn_spinner__area">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="drn_spinner__text">予約データを読み込み中…</p>
    </div>

    <!-- テーブル -->
    <v-card-text v-if="!reservationLoading && viewType == 'listview'" class="drn_content">
      <div class="drn_content__body">
      <v-sheet class="drn_content__data">
      <div class="drn_list">
      <div class="drn_list__body">
        <div class="drn_native_table_wrap">
          <table class="drn_native_table">
            <thead>
              <tr>
                <th v-for="h in headers" :key="h.key" class="drn_native_th" @click="h.sortable ? setSortKey(h.key) : undefined" :style="h.sortable ? 'cursor:pointer' : ''">
                  {{ h.title }}<span v-if="h.sortable"> {{ sortKey === h.key ? (sortAsc ? '▲' : '▼') : '⇅' }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedRoutes"
                :key="item.id"
                :class="{'drn_table__selected': selectedRow === item.id }"
                @click="selectRoute(item.id, item.airwayId, item.section, item.airwaySectionId, item.startJunctionId, item.endJunctionId)"
              >
                <td :class="{'drn_table__selected_first_td': selectedRow === item.id }" style="text-align:center">
                  <div :class="{'change-color-airwaystatus': item.reservationStatus === '予約済み', 'change-color-evaluation-airwaystatus': item.reservationStatus !== '予約済み'}">
                    {{ item.reservationStatus }}
                  </div>
                </td>
                <td>{{ item.startDay }}</td>
                <td>{{ item.endDay }}</td>
                <td>{{ item.reservationNumber }}</td>
                <td>{{ item.route }}</td>
                <td>{{ item.section }}</td>
                <td>{{ item.reservationDay }}</td>
                <td>
                  <span class="drn_detail_btn" :class="{'drn_detail_btn--loading': airwayDataLoading}" @click.stop="airwayDataLoading ? undefined : openDetail(item)">
                    <img class="drn_table__detail_icon" src="/assets/css/img/main/circle-info-solid.svg" width="20" height="20">
                    <span v-if="airwayDataLoading" class="drn_detail_btn__forbidden">⊝</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- ページネーション -->
        <div class="drn_pagination">
          <div class="drn_pagination__per_page">
            <label>表示件数：
              <select v-model.number="itemsPerPage" @change="page = 1">
                <option v-for="n in [5,10,15,20]" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>
          </div>
          <div class="drn_pagination__info">{{ paginationInfo }}</div>
          <div class="drn_pagination__controls">
            <button class="drn_pager_btn" :disabled="page <= 1" @click="page = 1">«</button>
            <button class="drn_pager_btn" :disabled="page <= 1" @click="page--">‹</button>
            <button
              v-for="p in pageNumbers"
              :key="p"
              class="drn_pager_btn"
              :class="{'drn_pager_btn--active': p === page}"
              @click="page = p"
            >{{ p }}</button>
            <button class="drn_pager_btn" :disabled="page >= totalPages" @click="page++">›</button>
            <button class="drn_pager_btn" :disabled="page >= totalPages" @click="page = totalPages">»</button>
          </div>
        </div>
      </div>
      </div>
      </v-sheet>
      </div>
    </v-card-text>
    <!-- 地図表示 -->
    <v-card-text v-if="!reservationLoading && viewType == 'mapview'" class="drn_content">
      <div class="drn_content__body">
      <v-sheet class="drn_content__data">
      <div class="drn_list">
      <div class="drn_list__body">
        <div class="drn_native_table_wrap">
          <table class="drn_native_table">
            <thead>
              <tr>
                <th v-for="h in previewHeaders" :key="h.key" class="drn_native_th">{{ h.title }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedRoutes"
                :key="item.id"
                :class="{'drn_table__selected': selectedRow === item.id }"
                @click="selectRoute(item.id, item.airwayId, item.section, item.airwaySectionId, item.startJunctionId, item.endJunctionId)"
              >
                <td :class="{'drn_table__selected_first_td': selectedRow === item.id }" style="text-align:center">
                  <div :class="{'change-color-airwaystatus': item.reservationStatus === '予約済み', 'change-color-evaluation-airwaystatus': item.reservationStatus !== '予約済み'}">
                    {{ item.reservationStatus }}
                  </div>
                </td>
                <td>{{ item.route }}</td>
                <td>{{ item.section }}</td>
                <td>
                  <span class="drn_detail_btn" :class="{'drn_detail_btn--loading': airwayDataLoading}" @click.stop="airwayDataLoading ? undefined : openDetail(item)">
                    <img class="drn_table__detail_icon" src="/assets/css/img/main/circle-info-solid.svg" width="20" height="20">
                    <span v-if="airwayDataLoading" class="drn_detail_btn__forbidden">⊝</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- ページネーション (mapview) -->
        <div class="drn_pagination">
          <div class="drn_pagination__per_page">
            <label>表示件数：
              <select v-model.number="itemsPerPage" @change="page = 1">
                <option v-for="n in [5,10,15,20]" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>
          </div>
          <div class="drn_pagination__info">{{ paginationInfo }}</div>
          <div class="drn_pagination__controls">
            <button class="drn_pager_btn" :disabled="page <= 1" @click="page = 1">«</button>
            <button class="drn_pager_btn" :disabled="page <= 1" @click="page--">‹</button>
            <button
              v-for="p in pageNumbers"
              :key="p"
              class="drn_pager_btn"
              :class="{'drn_pager_btn--active': p === page}"
              @click="page = p"
            >{{ p }}</button>
            <button class="drn_pager_btn" :disabled="page >= totalPages" @click="page++">›</button>
            <button class="drn_pager_btn" :disabled="page >= totalPages" @click="page = totalPages">»</button>
          </div>
        </div>
      </div>
      </div>
      </v-sheet>
      <v-sheet rounded="lg" color="default" class="drn_content__map">
        <MapComponent
          v-if="airwayData && reservationData"
          :chartData="airwayData"
          :section="selectedSection"
          :airwayId="selectedAirwayId"
          :airwaySectionId="selectedAirwaySectionId"
          :showCheckBox=true
          :showLegend=true
          :showMarker=false
          :startJunctionId="startJunctionId"
          :endJunctionId="endJunctionId"
        />
      </v-sheet>
      </div>
    </v-card-text>
  </div>
</div>

<!-- データ取得中ガードモーダル -->
<div v-if="showLoadingModal" class="drn_loading_guard__overlay" @click="showLoadingModal = false">
  <div class="drn_loading_guard" @click.stop>
    <p class="drn_loading_guard__msg">データ取得中のため、この操作はできません</p>
    <button class="drn_loading_guard__close" @click="showLoadingModal = false">閉じる</button>
  </div>
</div>
</template>

<script>
  import MapComponent from '@/components/map/showAirwayReservationDetail.vue';

  export default {
  components: {
    MapComponent,
  },
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
      search: '',
      headers: [
        { title: '予約状況', align: 'start', key: 'reservationStatus', sortable: false },
        { title: '航路出発日時', align: 'start', key: 'startDay', sortable: true },
        { title: '航路到着日時', align: 'start', key: 'endDay', sortable: true },
        { title: '予約番号', align: 'start', key: 'reservationNumber', sortable: true },
        { title: '航路', align: 'start', key: 'route', sortable: true },
        { title: '区間', align: 'start', key: 'section', sortable: true },
        { title: '予約・更新日', align: 'start', key: 'reservationDay', sortable: true },
        { title: '詳細', align: 'start', key: 'details', sortable: false },
      ],

      selectedRow: null,
      selectedAirwayId: '', 
      selectedSection: '',
      selectedAirwaySectionId: [],
      startJunctionId: '',
      endJunctionId: '',
      itemsPerPage: 20,
      sortKey: '',
      sortAsc: true,
      page: 1,
      showPopup: false,
      showLoadingModal: false,
      purposes: ["物資運搬","送電線点検","河川監視","山岳監視","航空撮影","その他"],
      startDate: '',
      endDate: '',
      area: '',
      areaitems: [],
      filteredRoutes: [],
      falltrangeData: null,
      operatorData: null,
      cookie_role: null,
      role: null,
      relationship_airwayIds: [],
      reservation_airwayIds: [],
      viewType: 'listview',
      currentItems: [],
      portData: null,
    };
  },
  computed: {
    previewHeaders() {
      if (this.viewType === 'mapview') {
        return this.headers.filter(header => ['reservationStatus', 'route', 'section', 'details'].includes(header.key))
      }
      return this.headers
    },
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
    isListView() {
      return this.viewType === 'listview'
    },
  },
  watch: {
    async airwayData(newVal) {
      if (!newVal?.airway?.airways?.length) return;
      if (!this.portData) {
        const centerFromRect = (coords) => {
          const n = Math.min(coords.length, 4);
          let lat = 0, lng = 0;
          for (let i = 0; i < n; i++) { lat += coords[i][1]; lng += coords[i][0]; }
          return [lat / n, lng / n];
        };
        const portIds = [...new Set(this.reservationData.result.map(r => r.ports.map(p => p.portId)).flat(Infinity))];
        const fileredData = newVal.airway.airways
          .map(m => ({ airwayJunctions: m?.airwayJunctions?.find(j => j?.airways) }))
          .find(a => a?.airwayJunctions)?.airwayJunctions?.airways;
        if (fileredData) {
          const coordinate = centerFromRect(fileredData[0].airway.geometry.coordinates);
          const portSearchRadius = parseInt(useRuntimeConfig().public.semanticSearchRadiusMeters) || 20000;
          try {
            this.portData = await searchPorts(portIds, coordinate[0], coordinate[1], portSearchRadius, true);
          } catch (error) {
            console.error(`error: get droneport info: ${error.message}`, error);
          }
        }
      }
      this.filteredRoutes = await this.buildRoutes();
    },
    async airwayDataLoading(newVal) {
      // Stage3完了時（falseに変化時）に再構築して「データ取得中」を觧履简決
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
      // 予約データがまだ空なら何もしない
      if (!this.reservationData?.result?.length) return [];
      const reservationList = [];

      // 最大許容落下範囲情報取得
      const falltrangeRes = await $fetch('/api/airway/max-fall-range', { 
        method: 'GET',
        query: { businessNumber: useRuntimeConfig().public.businessNumber }
      });
      this.falltrangeData = {};
      this.falltrangeData = convertMaxFallRangeToFallToleranceRanges(falltrangeRes.data);
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
        console.error(`RouteReservationItemList getAreaJsonData Faild.`);
        return;      
      }
      console.log(`areaitems: ${this.areaitems}`);

      // /operator廃止につき事業者一覧取得は展進しない
      /* ★ GET /operator 廃止：暫定対応（取得部コメント化）
      const miscApiBaseUrl = useRuntimeConfig().public.miscApiBaseUrl;
      const operatorUrl = `${miscApiBaseUrl}/operator`;
      const operatorRes = await axios_get(operatorUrl);
      if (operatorRes.status === 200 && operatorRes.data != undefined) {
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
        console.error(`error: get operator info {status: ${operatorRes.status}}.`);
        return;
      }
      console.log(`companyNameItems: ${this.companyNameItems}`);

      // ユーザが関係者である場合、関係のあるopreratorIdでフィルタリング
      if (this.role == 3) {
        // 関連のある航路IDを取得
        if (operatorRes.status === 200 && operatorRes.data != undefined) {
          this.relationship_airwayIds = [];
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
      */
      const LOADING = 'データ取得中';
      let id = 1;
      if(!("result" in this.reservationData)){
        return reservationList;
      }
      this.reservationData['result'].forEach((reservation) => {
        let airwaySections = []
        let reservationIds = []
        for(let i=0; i<reservation['airwaySections'].length; i++){
          airwaySections.push(reservation['airwaySections'][i]['airwaySectionId']);
          reservationIds.push(reservation['airwaySections'][i]['reservationId'])
        }
        let airwayIds = []
        airwaySections.forEach((airwaySection) => {
          airwayIds.push(useAirwayGetAirwayIdFromSectionId(this.airwayData, airwaySection)) // 予約に含まれる航路区画IDをもとに航路IDを特定
        });
        
        const rawReservationStatus = reservation['status'];
        let route = []
        // let name = []
        let area = []
        let purpose = []
        airwayIds.forEach((airwayId) => {
          const rName = useAirwayGetAirwayNameFromAirwayId(this.airwayData, airwayId);
          route.push(this.airwayDataLoading && rName === 'Not found.' ? LOADING : rName)
          // name.push(useAirwayGetAirwayNameFromAirwayId(this.airwayData, airwayId))
          area.push(getareaName(this.falltrangeData, airwayId))
          purpose.push(useAirwayGetPurposeFromAirwayId(this.airwayData, airwayId))
        })
        // let juncs = []
        // reservation['airwaySections'].forEach((section) => {
        //   let s = [section]
        //   juncs.push(useAirwayGetCorridorPointRangeFromSectionIdList(this.airwayData, s))
        // })

        
        // 指定航路区画の航路点情報取得
        const getAirwayJunctions = (airwaySectionId) => {
          const [juncitons] =
            this.airwayData.airway.airways
                  .filter(airway => airway.airwaySections.some(section => section.airwaySectionId == airwaySectionId))
                  .map(airway => (
                      airway.airwayJunctions
                        .filter(junction => airway.airwaySections.find(section => section.airwaySectionId == airwaySectionId)
                        .airwayJunctionIds.includes(junction.airwayJunctionId)) )
                  );
          return juncitons ?? [];
        };
        // 離着陸場に最寄りの航路点名を取得
        const getNearestJunctionNameToPort = (portId, junctions) => {
          const [targetPort] = this.portData?.data?.filter(d => d?.dronePortId == portId) ?? [];
          const range = [];

          // 対象ポートが存在しない場合は null を返却
          if(!targetPort) return null;

          // 航路点毎に指定ポートとの直線距離を算出
          junctions.forEach((junction) => {
            let points = junction.airways[0].airway.geometry.coordinates;
            let arr = points;

            const [x1, y1] = points[0];
            const [xN, yN] = points[points.length - 1];
            const eps = 1e-12;
            if (Math.abs(x1 - xN) < eps && Math.abs(y1 - yN) < eps) {
              arr = points.slice(0, -1);
            }

            let sumX = 0, sumY = 0, n = 0;
            for (const p of arr) {
              if (!Array.isArray(p) || p.length < 2) continue;
              sumX += p[0];
              sumY += p[1];
              n++;
            }
            if (n === 0) return;
            // 名前と直線距離を格納
            range.push([junction.name, Math.hypot(sumX / n - targetPort.lon, sumY / n - targetPort.lat)]);
          });
          return range.length ? range.reduce((min, e) => (Number(e[1]) < Number(min[1]) ? e : min))[0] : null;
        };

        // 離着陸場に最寄りの航路点IDを取得
        const getNearestJunctionIdToPort = (portId, junctions) => {
          const [targetPort] = this.portData?.data?.filter(d => d?.dronePortId == portId) ?? [];
          const range = [];
          if(!targetPort) return null;

          junctions.forEach((junction) => {
            let points = junction.airways[0].airway.geometry.coordinates;
            let arr = points;

            const [x1, y1] = points[0];
            const [xN, yN] = points[points.length - 1];
            const eps = 1e-12;
            if (Math.abs(x1 - xN) < eps && Math.abs(y1 - yN) < eps) {
              arr = points.slice(0, -1);
            }

            let sumX = 0, sumY = 0, n = 0;
            for (const p of arr) {
              if (!Array.isArray(p) || p.length < 2) continue;
              sumX += p[0];
              sumY += p[1];
              n++;
            }
            if (n === 0) return;

            // nameではなく id を保持
            range.push([junction.airwayJunctionId, Math.hypot(sumX / n - targetPort.lon, sumY / n - targetPort.lat)]);
          });

          return range.length ? range.reduce((min, e) => (Number(e[1]) < Number(min[1]) ? e : min))[0] : null;
        };

        let section = "Not found"
        let startJunctionId = '';
        let endJunctionId = '';
        const sectionCount = reservation?.airwaySections?.length ?? 0;

        if(sectionCount == 1) {   // １区画のみの場合
          if(reservation?.ports?.length > 1) {
            // 離着陸場予約あり：離着陸場に一番近い航路点を取得
            const juntions = getAirwayJunctions(reservation.airwaySections[0].airwaySectionId);
            section =
              (getNearestJunctionNameToPort(reservation.ports[0]?.portId, juntions) ?? juntions[0]?.name ?? 'Not found') + ' ~ ' +
              (getNearestJunctionNameToPort(reservation.ports[1]?.portId, juntions) ?? juntions[1]?.name ?? 'Not found');

            startJunctionId = (getNearestJunctionIdToPort(reservation.ports[0]?.portId, juntions) ?? juntions[0]?.airwayJunctionId ?? '');
            endJunctionId   = (getNearestJunctionIdToPort(reservation.ports[1]?.portId, juntions) ?? juntions[1]?.airwayJunctionId ?? juntions[juntions.length - 1]?.airwayJunctionId ?? '');

          } else {
            // 離着陸場予約なし：配列格納順で航路点を取得
            const js = getAirwayJunctions(reservation.airwaySections[0].airwaySectionId);

            section = js?.length ? js.map(j => j.name).join(' ~ ') : 'Not found';

            startJunctionId = js[0]?.airwayJunctionId ?? '';
            endJunctionId   = js[js.length - 1]?.airwayJunctionId ?? '';
          }
        } else
        if(sectionCount > 1) {    // 複数区画ありの場合
          // セクション名取得
          const getJunctionName = (isStart) => {
            const firstIndex = isStart ? 0 : reservation.airwaySections.length - 1;
            const secondIndex = firstIndex + (isStart ? 1 : -1);

            const firstJunctions = getAirwayJunctions(reservation.airwaySections[firstIndex].airwaySectionId);
            const secondJunctions = getAirwayJunctions(reservation.airwaySections[secondIndex].airwaySectionId);

            // 前後の区間に重複する航路点を除く
            const junctions = firstJunctions?.filter(j => !secondJunctions.map(m => m?.airwayJunctionId).includes(j.airwayJunctionId))

            if(!junctions?.length) {
              return "Not found";
            } else if(junctions.length == 1) {
              return junctions[0]?.name;
            } else {
              if(reservation?.ports?.length > 1) {
                // 離着陸場予約あり：離着陸場に一番近い航路点を取得
                return getNearestJunctionNameToPort(reservation.ports[+!isStart]?.portId, firstJunctions) ?? firstJunctions[+!isStart]?.name ?? 'Not found';
              } else {
                // 離着陸場予約なし：配列格納順で航路点を取得
                return firstJunctions[+!isStart]?.name ?? 'Not found';
              }
            }
          }
          const getStartJunction = () => getJunctionName(true);
          const getEndJunction = () => getJunctionName(false);

          // 区間名取得
          section = getStartJunction() + ' ~ ' + getEndJunction();

          const getJunctionId = (isStart) => {
            const firstIndex = isStart ? 0 : reservation.airwaySections.length - 1;
            const secondIndex = firstIndex + (isStart ? 1 : -1);
  
            const firstJunctions = getAirwayJunctions(reservation.airwaySections[firstIndex].airwaySectionId);
            const secondJunctions = getAirwayJunctions(reservation.airwaySections[secondIndex].airwaySectionId);
  
            const junctions = firstJunctions?.filter(j => !secondJunctions.map(m => m?.airwayJunctionId).includes(j.airwayJunctionId));
  
            if(!junctions?.length) {
              return '';
            } else if(junctions.length == 1) {
              return junctions[0]?.airwayJunctionId ?? '';
            } else {
              if(reservation?.ports?.length > 1) {
                return (getNearestJunctionIdToPort(reservation.ports[+!isStart]?.portId, firstJunctions) ?? firstJunctions[+!isStart]?.airwayJunctionId ?? '');
              } else {
                return firstJunctions[+!isStart]?.airwayJunctionId ?? '';
              }
            }
          };
  
          startJunctionId = getJunctionId(true);
          endJunctionId = getJunctionId(false);
        }

        // airwayData 未取得・ロード中の場合は "データ取得中" を表示
        if (this.airwayDataLoading && (section === 'Not found' || section.includes('Not found'))) {
          section = LOADING;
        }

        let element = {
          id: reservation['airwayReservationId'],
          airwayId: airwayIds,
          operatorId: reservation['operatorId'],
          // 適合性確認改修 start
          evaluationResults: reservation['evaluationResults'],
          reservationStatus: reservation['evaluationResults'] ? this.convertReservationStatus(rawReservationStatus) : reservation['evaluationStatus'],
          // 適合性確認改修 end
          rawReservationStatus: rawReservationStatus,
          startDay: useDateString1(reservation['airwaySections'][0]['startAt']),
          endDay: useDateString1(reservation['airwaySections'][reservation['airwaySections'].length-1]['endAt']),
          rawStartDay: reservation['airwaySections'][0]['startAt'],
          rawEndDay: reservation['airwaySections'][reservation['airwaySections'].length-1]['endAt'],
          reservationNumber: reservation['airwayReservationId'],
          route: [...new Set(route.map(s => s.trim()))].join(", "),
          section: section,
          reservationDay: useDateString2(reservation['reservedAt']),
          updateDay: useDateString2(reservation['updatedAt']),
          details: '詳細',
          name: route,
          area: area,
          purpose: purpose,
          companyName: '',
          airwaySectionId: airwaySections,
          vehicleId: reservation.vehicles.map(v => v?.vehicleId).filter(id => id != null),
          registrationId: reservation?.vehicles?.[0]?.aircraftInfo?.registrationId ?? "",
          portFrom: reservation.ports[0]?.name,
          portTo: reservation.ports[1]?.name,
          reservationIds: reservationIds,
          startJunctionId: startJunctionId,
          endJunctionId: endJunctionId,
          totalAmount: reservation.totalAmount,
        };
        reservationList.push(element);
        id++;
      }); 
      return reservationList;
    },
    convertReservationStatus(status) {
      switch(status) {
        case 'RESERVED':
          return '予約済み';
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
        const matched = newestDataMap[route.id];
        if (matched) {
          // reservationStatus を notifyType に更新
          
          // 適合性確認改修 start
          route.rawReservationStatus = matched.status;
          if (route.rawReservationStatus == 'CANCELED' || route.rawReservationStatus == 'RESCINDED') {
            route.reservationStatus = '　中止　';
          } else if(matched.evaluationResults === true){
              route.reservationStatus = '予約済み'
          }else{
            route.reservationStatus = matched.type;
          }
          // 適合性確認改修 end
        }
      });
      //反映し終わったら空にしておく
      localStorage.setItem("airwayEvaluationDB",[]);
    },
    async onPageChange(newPage) {
      console.log(newPage);
      this.page = newPage;
    },
    selectRoute(id, airwayId, section, airwaySectionId, startJunctionId, endJunctionId) {
      this.selectedRow = this.selectedRow === id ? null : id;
      this.selectedAirwayId = airwayId;
      this.selectedSection = section;
      this.selectedAirwaySectionId = airwaySectionId;
      this.startJunctionId = startJunctionId ?? '';
      this.endJunctionId = endJunctionId ?? '';
      console.log("airwayId : " ,airwayId);
      console.log("section : ", section);
    },
    setSortKey(key) {
      if (this.sortKey === key) {
        this.sortAsc = !this.sortAsc;
      } else {
        this.sortKey = key;
        this.sortAsc = true;
      }
    },
    openDetail(item) {
      if (!this.ownDataReady) {
        this.showLoadingModal = true;
        return;
      }
      // 予約詳細に必要なデータをセッションストレージに保存。
      // 詳細ページは reservationNumber のみ受け取り、ここで保存したデータを使って表示する。
      // airwayData は対象予約の航路IDのみ抽出して容量を抑制する。
      try {
        const airwayIdSet = new Set((item.airwayId ?? []).map(String));
        const relevantAirways = (this.airwayData?.airway?.airways ?? [])
          .filter(aw => airwayIdSet.has(String(aw.airwayId)));
        const detailPayload = {
          item,
          airwayData: { airway: { airways: relevantAirways } },
        };
        sessionStorage.setItem(
          `rsv:detail:${item.reservationNumber}`,
          JSON.stringify(detailPayload)
        );
      } catch (e) {
        console.warn('[openDetail] sessionStorage write failed:', e);
      }
      this.$router.push({
        path: '/airwayReservation/detail',
        query: { reservationNumber: item.reservationNumber },
      });
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
        const itemStart = new Date(item.startDay);
        console.log(`itemStart: ${itemStart}`);
        const itemEnd = new Date(item.endDay);
        console.log(`itemEnd: ${itemEnd}`);

        const isPurposeMatch = !this.purposes.length || this.purposes.some(purpose => item.purpose.includes(purpose));
        // 航路出発日時
        const isStartMatch = !start || (start <= itemStart && end >= itemStart);
        console.log(`isStartMatch: ${isStartMatch}`);
        // 航路到着日時
        const isEndMatch = !end || (start <= itemEnd && end >= itemEnd);
        console.log(`isEndMatch: ${isEndMatch}`);
        let isDateMatch = false;
        if (isStartMatch == true || isEndMatch == true) {
          // 開始または終了いずれかが範囲内なら対象とする。
          isDateMatch = true;
          console.log(`isDateMatch: ${isDateMatch}`);
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
    setList() {
      this.viewType = 'listview';
    },
    setMap() {
      this.viewType = 'mapview';
    },
    async onUpdateCurrentItems(items) {
      // 適合性確認改修 start
      this.currentItems = items;
      console.log(this.currentItems);

      const promises = [];
      for (let i = 0; i < this.currentItems.length; i++) {
        // キャンセルもしくは撤回済みの予約については適合性確認APIを実行しない
        if (this.currentItems[i].raw.rawReservationStatus == 'CANCELED' || this.currentItems[i].raw.rawReservationStatus == 'RESCINDED') {
          this.currentItems[i].raw.reservationStatus = '　中止　'
          continue;
        }

        // // 予約と紐づく機体取得
        // const url = '/api/getAircraftInfoFrom?id=' + this.currentItems[i].raw.id;
        // const routeRequest = axios_get(url).then(async (response) => {
        //   if (response.status !== 200 || response.data.aircraftInfo === null) {
        //     this.currentItems[i].raw.reservationStatus = "取得失敗";
        //     return;
        //   }
        // });

        // promises.push(routeRequest);
      }

      // // 全ての非同期リクエストが完了するのを待つ
      // await Promise.all(promises);
      // 適合性確認改修 end
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
      console.log(`virtual_role:${this.cookie_role.virtual_role}`);
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
      console.log(`role:${this.role}`);

      // ヘルパー: ポリゴン(矩形)の中心を算出（最初の4点で平均）
      const centerFromRect = (coords) => {
        const n = Math.min(coords.length, 4);
        let lat = 0, lng = 0;
        for (let i = 0; i < n; i++) {
          lat += coords[i][1]; // lat
          lng += coords[i][0]; // lng
        }
        return [lat / n, lng / n]; // Leafletは [lat, lng]
      };

      // ドローンポート情報取得
      const portIds = [...new Set(this.reservationData.result.map(r => r.ports.map(p => p.portId)).flat(Infinity))];
      const fileredData = this.airwayData.airway.airways
                            .map(m => ({ airwayJunctions: m?.airwayJunctions?.find(j => j?.airways) }))
                            .find(a => a?.airwayJunctions)?.airwayJunctions?.airways;
      if(fileredData) { 
        const coordinate = centerFromRect(fileredData[0].airway.geometry.coordinates);
        const portSearchRadius = parseInt(useRuntimeConfig().public.semanticSearchRadiusMeters) || 20000;

        try {
          this.portData = await searchPorts(portIds, coordinate[0], coordinate[1], portSearchRadius, true);
        }
        catch(error) {
          console.error(`error: get droneport info: ${error.message}`, error);
        }
      }

      this.filteredRoutes = await this.buildRoutes();
    }
  },
  async mounted() {
    // 10秒ごとにローカルストレージをチェックする
    this.timer = setInterval(() => {
      this.checkLocalStorage();
      console.log('check local');
    }, 10000);
  },
  unmounted() {
    // コンポーネントが破棄される際にタイマー停止
    clearInterval(this.timer);
  },
  };
</script>
  
<style scoped>

/* コンポーネント全高フィル */
.drn_main__app {
  height: 100%;
  min-height: 0;
}
.drn_content__data {
  overflow: hidden;
}
.drn_list__body {
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

.option-search {
  display: flex;
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
/* 詳細ボタン */
.drn_detail_btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  position: relative;
}
.drn_detail_btn--loading {
  cursor: not-allowed;
  opacity: 0.5;
}
.drn_detail_btn__forbidden {
  position: absolute;
  bottom: -6px;
  right: -8px;
  font-size: 12px;
  color: #e53935;
  line-height: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
}
.drn_detail_btn--loading:hover .drn_detail_btn__forbidden {
  opacity: 1;
}
/* データ取得中ガードモーダル */
.drn_loading_guard__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.drn_loading_guard {
  background: #fff;
  border-radius: 8px;
  padding: 32px 40px;
  min-width: 280px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.drn_loading_guard__msg {
  font-size: 15px;
  margin: 0 0 20px;
  color: #333;
}
.drn_loading_guard__close {
  padding: 6px 24px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.v-table__wrapper table tbody tr td {
  vertical-align: middle;
}

</style>

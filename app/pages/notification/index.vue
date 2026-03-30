<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useMqtt } from '~/composables/useMqtt'

async function fetchAirwayReservationId(dronePortReservationId) {
  let airwayReservationId = '';
  // /api/getAirwayReservationIdFrom はDBを使っており、使わなくなったため必ず失敗する
  // if (dronePortReservationId) {
  //   try {
  //     const url = '/api/getAirwayReservationIdFrom';
  //     let response = await axios_get(url, {id: dronePortReservationId}, {});
  //     if (response.status === 200) {
  //       const rsvId = response.data.id;
  //       if (rsvId !== '') airwayReservationId = rsvId;
  //     } else {
  //       console.error(`error: getAirwayReservationIdFrom {status: ${response.status}}.`);
  //     }
  //   } catch (err) {
  //     console.error('Error: fetchAirwayReservationId: ', err);
  //   }
  // }
  return airwayReservationId;
}

try {



  const {
    status,
    latestMessage,
    topicName,
    connectMqtt,
  } = useMqtt();

  const vm = getCurrentInstance()?.proxy
  const airwayEvaluationStored = localStorage.getItem("airwayEvaluationDB")  || '[]';
  const airwayEvaluationData = ref(JSON.parse(airwayEvaluationStored))

  onMounted(() => {
    localStorage.setItem('notificationBadge', String(''));
    // 自身の operatorId と parentOperatorId あての通知のみ購読
    const operatorId = localStorage.getItem('uasl:user:operatorId') || '+';
    const parentOperatorId = localStorage.getItem('uasl:user:parentOperatorId') || '+';
    const ids = [...new Set([operatorId, parentOperatorId])];
    const topics = ids.flatMap(id => [
      `airway/operator/${id}/airwayEvaluationNotify/+`,
      `airway/operator/${id}/airwayDeviationNotification`,
      `airway/operator/${id}/airwayReservation/+`,
      `airway/operator/${id}/vis/droneport/+/+/cmd`,
      `uasl/operator/${id}/uaslDeviationNotification`,
      `uasl/operator/${id}/uaslReservation/+`,
    ]);
    connectMqtt(topics);
  })

  watch([latestMessage, topicName], ([newMsg, newTopic]) => {
    if (!newMsg){ return } // newMsg が空の場合は何もしない
    const currentDate = new Date();
    const notifyDate = useDateString1(currentDate);
    let msg = JSON.parse(newMsg);
    console.log(vm.routeCurrentId);
    console.log("newMsg",newMsg);
    console.log("newTopic",newTopic);
    const tokens = newTopic.split('/');
    if (tokens.length >= 1) {
      if (tokens[3] === 'airwayEvaluationNotify') {
        let airwayName = 'Not found';
        vm.reservationList.forEach((reservation) => {
          if (reservation.reservationId == msg.airwayReservationId) {
            airwayName = reservation.airwayName;
            return;
          }
        })
        let notifyType = '';
        if(msg.evaluationResults === true){
          notifyType = "運航中";
        }else{
          switch (msg.type) {
            case "weather":
              notifyType = "気象異常";
              break;
            case "event":
              notifyType = "規制イベント";
              break;
            case "railway":
              notifyType = "鉄道異常";
              break;
            case "intrusion":
              notifyType = "人立ち入り";
              break;
            default:
              notifyType = msg.type;
              break;
          }
        }
  
        let airwayEvaluationType = '';
        let reasons = '';
        if(msg.evaluationResults === true){
          airwayEvaluationType = "運航中";
          reasons = ""
        }else{
          airwayEvaluationType = msg.type;
          reasons = msg.reasons;
        }
        
        const addAirwayEvaluationRoute = {
          receiveTime: currentDate,
          reservationId: msg.airwayReservationId,
          evaluationResults: msg.evaluationResults,
          type: airwayEvaluationType,
          reasons: reasons
        }
        
        airwayEvaluationData.value.push(addAirwayEvaluationRoute);
        localStorage.setItem('airwayEvaluationDB', JSON.stringify(airwayEvaluationData.value));
  
        const addRoute = {
          id: vm.routeCurrentId,
          notifyDate: notifyDate,
          reservationId: msg.airwayReservationId,
          notifyType: notifyType,
          airwayName: airwayName
        }
        vm.filteredRoutes.push(addRoute);
        localStorage.setItem("noticeDB", JSON.stringify(vm.filteredRoutes));
        vm.routeCurrentId = vm.routeCurrentId + 1;
        
      } else if (tokens[3] === 'airwayDeviationNotification') {
        let airwayName = 'Not found';
        vm.reservationList.forEach((reservation) => {
          if (reservation.reservationId == msg.airwayReservationId) {
            airwayName = reservation.airwayName;
            return;
          }
        })
        let notifyType = '';
        if(msg.evaluationResults === true){
          notifyType = "運航中";
        }else{
          notifyType = "航路逸脱";
        }
  
        const addRoute = {
          id: vm.routeCurrentId,
          notifyDate: notifyDate,
          reservationId: msg.airwayReservationId,
          notifyType: notifyType,
          airwayName: airwayName
        }
        vm.filteredRoutes.push(addRoute);
        localStorage.setItem("noticeDB", JSON.stringify(vm.filteredRoutes));
        vm.routeCurrentId = vm.routeCurrentId + 1;
      } else if (tokens[3] === 'uaslDeviationNotification') {
        let uaslName = 'Not found';
        vm.reservationList.forEach((reservation) => {
          if (reservation.reservationId == msg.uaslReservationId) {
            uaslName = reservation.uaslName;
            return;
          }
        })
        let notifyType = '';
        if(msg.operationalStatus === "RouteApproach") {
          notifyType = "航路進入前";
        } else if (msg.operationalStatus === "NormalOperation") {
          notifyType = "運航中";
        } else if (msg.operationalStatus === "RouteDeviation") {
          notifyType = "航路逸脱";
        } else if (msg.operationalStatus === "PlannedRouteDeviation") {
          notifyType = "計画された航路逸脱";
        }
  
        const addRoute = {
          id: vm.routeCurrentId,
          notifyDate: notifyDate,
          reservationId: msg.uaslReservationId,
          notifyType: notifyType,
          airwayName: uaslName
        }
        vm.filteredRoutes.push(addRoute);
        localStorage.setItem("noticeDB", JSON.stringify(vm.filteredRoutes));
        vm.routeCurrentId = vm.routeCurrentId + 1;
      } else if (tokens[3] === 'uaslReservation') {
        // reservationId が含まれる場合は乗り入れ先航路通知、含まれない場合は主航路通知
        const isDestination = 'reservationId' in msg;
        const notifyType = isDestination ? '予約通知（乗入れ先）' : '予約通知（主経路）';
        const reservationId = isDestination ? msg.reservationId : msg.requestId;
        const airwayName = isDestination ? (msg.uaslId ?? '') : (msg.originReservation?.uaslId ?? '');

        const addRoute = {
          id: vm.routeCurrentId,
          notifyDate: notifyDate,
          reservationId: reservationId,
          notifyType: notifyType,
          airwayName: airwayName
        }
        vm.filteredRoutes.push(addRoute);
        localStorage.setItem("noticeDB", JSON.stringify(vm.filteredRoutes));
        vm.routeCurrentId = vm.routeCurrentId + 1;
      } else if (tokens[3] === 'airwayReservation') {
        let airwayName = 'Not found';
        vm.reservationList.forEach((reservation) => {
          if (reservation.reservationId == msg.airwayReservationId) {
            airwayName = reservation.airwayName;
            return;
          }
        })
        let notifyType = msg.status;

        switch (msg.status) {
          case "AVAILABLE":
            notifyType = "予約可能";
            break;
          case "RESERVED":
            notifyType = "予約済み";
            break;
          case "CANCELED":
            notifyType = "取消済み";
            break;
          case "RESCINDED":
            notifyType = "撤回済み";
            break;
          default:
            notifyType = msg.status;
            break;
        }
        const addRoute = {
          id: vm.routeCurrentId,
          notifyDate: notifyDate,
          reservationId: msg.airwayReservationId,
          notifyType: notifyType,
          airwayName: airwayName
        }
        vm.filteredRoutes.push(addRoute);
        localStorage.setItem("noticeDB", JSON.stringify(vm.filteredRoutes));
        vm.routeCurrentId = vm.routeCurrentId + 1;
      } else if (tokens[4] === 'droneport') {
        const dronePortReservationId = msg.dronePortReservationId;
        const requestKind = msg.requestKind;

        fetchAirwayReservationId(dronePortReservationId)
        .then((res) => {
          console.log('[page] res:', res);
          const airwayReservationId = res;
          if (airwayReservationId === '') {
            console.error('Error: airwayReservationId empty, portId:', dronePortReservationId);
          } else {
            let airwayName = 'Not found';
            vm.reservationList.forEach((reservation) => {
              if (reservation.reservationId == airwayReservationId) {
                airwayName = reservation.airwayName;
                return;
              }
            })

            let notifyType = '';
            switch (requestKind) {
            case 0: notifyType = '離陸準備指示'; break;
            case 1: notifyType = '着陸準備指示'; break;
            case 2: notifyType = '離陸通知'; break;
            case 3: notifyType = '着陸通知'; break;
            case 4: notifyType = '離陸キャンセル通知'; break;
            case 5: notifyType = '着陸キャンセル通知'; break;
            default: break;
            }

            const addRoute = {
              id: vm.routeCurrentId,
              notifyDate: notifyDate,
              reservationId: airwayReservationId,
              notifyType: notifyType,
              airwayName: airwayName
            }
            vm.filteredRoutes.push(addRoute);
            localStorage.setItem("noticeDB", JSON.stringify(vm.filteredRoutes));
            vm.routeCurrentId = vm.routeCurrentId + 1;
            console.log('[page] recv droneport topic:', airwayReservationId, dronePortReservationId, notifyType, airwayName);
          }
        })
        .catch((err) => {
          console.error('Error: airwayReservationId empty, portId:', dronePortReservationId);
        })
      } else {
        console.log('想定外のトピックです:', newTopic);
      }
    } else {
      console.log('トピックの形式が不正です:', newTopic);
    }
  
  
  
  })

} catch (error) {
  
}
</script>

<template>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
  <GlobalNavigation v-if = "role == 2" />
  <GlobalNavigationSH v-if = "role == 3" />
  
  <!-- コンテンツ -->
  <main id="main" class="b-pageMain">
    <!-- メインコンテンツ -->
    <div class="b-pageContentHasNavigation">
      <div class="drn_main__app">
        <div variant="flat" class="drn_main__content">

          <!-- ヘッダ -->
          <div class="drn_header">
            <div class="drn_header__item">
              <v-card-title class="drn_header__title">通知一覧</v-card-title>
            </div>
          </div>

          <!-- 予約一覧テーブル -->
          <v-card-text class="drn_content">
            <div class="drn_content__body">
              <v-sheet class="drn_content__data">
                <div class="drn_list">
                  <div class="drn_list__body">
                    <!-- テーブル -->
                    <v-data-table
                      v-model:items-per-page="itemsPerPage"
                      :headers="headers"
                      :items="filteredRoutes"
                      item-value="id"
                      item-key="id"
                      class="drn_list__table"
                      @update:selected-items="selectRoute"
                      @update:sort-key="updateSort"
                      :sort-key="sortKey"
                      :sort-order="sortOrder"
                      :items-per-page-options="[5, 10, 15, 20]"
                    >
                      <template v-slot:body="{ items }">
                        <tr
                        v-for="(item, index) in items"
                        :key="item.id"
                        :class="{'drn_table__selected': selectedRow === item.id }"
                        @click="selectRoute(item.id)"
                        >
                          <td :class="{'drn_table__selected_first_td': selectedRow === item.id }">{{ item.notifyDate }}</td>
                          <td>{{ item.reservationId }}</td>
                          <td>{{ item.notifyType }}</td>
                          <td>{{ item.airwayName }}</td>
                          <td><router-link :to="{ path: '/airwayReservation/detail', query: {
                            id: getChartDataByReservation(item.reservationId)?.id, 
                            airwayId: getChartDataByReservation(item.reservationId)?.airwayId,
                            reservationNumber: getChartDataByReservation(item.reservationId)?.reservationNumber, 
                            reservationStatus: getReservationStatus(getChartDataByReservation(item.reservationId)?.reservationStatus),
                            rawReservationStatus: getChartDataByReservation(item.reservationId)?.reservationStatus,
                            reservationDay: getChartDataByReservation(item.reservationId)?.reservationDay, 
                            route: item.airwayName, 
                            section: getChartDataByReservation(item.reservationId)?.section, 
                            purpose: getChartDataByReservation(item.reservationId)?.purpose, 
                            startDay: getChartDataByReservation(item.reservationId)?.Departure,
                            endDay: getChartDataByReservation(item.reservationId)?.Arrival, 
                            operatorId: getChartDataByReservation(item.reservationId)?.operatorId,
                            airwaySectionId: getChartDataByReservation(item.reservationId)?.airwaySectionId,
                            startJunctionId: getChartDataByReservation(item.reservationId)?.startJunctionId,
                            endJunctionId: getChartDataByReservation(item.reservationId)?.endJunctionId,
                            vehicleId: getChartDataByReservation(item.reservationId)?.vehicleId,
                            portFrom: getChartDataByReservation(item.reservationId)?.portFrom,
                            portTo: getChartDataByReservation(item.reservationId)?.portTo,
                            reservationIds: getChartDataByReservation(item.reservationId)?.reservationIds,
                            registrationId: getChartDataByReservation(item.reservationId)?.registrationId,
                          } }"><img class="drn_table__detail_icon" src="/assets/css/img/main/circle-info-solid.svg" width="20" height="20"></router-link></td>
                        </tr>
                      </template>
                    </v-data-table>
                  </div>
                </div>
              </v-sheet>
            </div>
          </v-card-text>
        </div>
      </div>
    </div>

    <!-- ページナビゲーション -->
    <PageNavigation :back="true">
      <ul class="e-buttonGroup">
        <li>
          <a href="/airway" class="e-button">航路予約一覧</a>
        </li>
      </ul>
    </PageNavigation>
  </main> 
</template>

<script>
import { ref } from "vue";
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 運航事業者向けサイドバー
import GlobalNavigation from "~/components/navigation/globalNavigation.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "~/components/navigation/pageNavigation.vue";

export default {
  data() {
  return {
    headers: [
      { title: '通知日時', align: 'start', key: 'notifyDate', sortable: true },
      { title: '予約番号', align: 'start', key: 'reservationId', sortable: true },
      { title: '通知種別', align: 'start', key: 'notifyType', sortable: true },
      { title: '航路', align: 'start', key: 'airwayName', sortable: true },
      { title: '詳細', align: 'start', key: 'detail', sortable: false },
    ],
    selectedRow: null,
    itemsPerPage: 10,
    sortKey: '', // ソートキー
    sortOrder: 1, // 1: 昇順, -1: 降順
    filteredRoutes: [],
    role: null,
    chartData:null,
    reservationData: null,
    reservationList: null,
    routeCurrentId:0,
   };
  },
  components: {
    GlobalNavigationRM,
    GlobalNavigation,
    GlobalNavigationSH,
    PageNavigation,
  },
  methods: {
    selectRoute(id) {
      this.selectedRow = this.selectedRow === id ? null : id;
    },
    updateSort({ key, order }) {
      this.sortKey = key;
      this.sortOrder = order;

      console.log('Updated sortKey:', this.sortKey);
      console.log('Updated sortOrder:', this.sortOrder);
    },
    getChartDataByReservation(reservationId) {
      if (!this.reservationList) return {};
      return this.reservationList.find(data => data.reservationId === reservationId) || {};
    },
    getReservationStatus(status) {
      switch(status) {
        case 'RESERVED':
          return '予約済み';
        case 'CANCELED':
          return '　中止　';
        case 'RESCINDED':
          return '　中止　';
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
    }
  },
  async mounted() {
    // 本来はここで REST API か MQTT で情報を取得する
    let data = localStorage.getItem("noticeDB")
    if(data){
      this.routes = JSON.parse(data);
      console.log("maxyou",this.routes);
      
      const maxId = Math.max(...this.routes.map(route => route.id));
      console.log(maxId)
      this.routeCurrentId = maxId + 1;
      console.log(this.routeCurrentId)
      
      // ローカルストレージ登録時に航路名が見つからなかった場合は、「Not found」と表示されるが、
      // 後の処理で航路名を特定できるばあいがあるため、「取得中...」と表示。
      for (let i = 0; i < this.routes.length; i++) {
        if (this.routes[i]['airwayName'] == 'Not found.') {
          this.routes[i]['airwayName'] = '取得中...';
        }
      }
    }else{
      this.routes = [];
    }
    
    this.filteredRoutes = this.routes;

    const uaslRes = await $fetch('/api/airway/uasl', { 
      method: 'GET',
      query: { all: true }
    });
    console.log(uaslRes);
    if (uaslRes.status !== 200) {
      console.error(`error: get uasl info {status: ${uaslRes.status}}.`);
      this.chartData = {};
      return;
    }
    const uaslResData = utils.convertUaslToAirway(uaslRes.data);
    this.chartData = useAirwayConvertConnectionOrder(uaslResData);
    let lastPage = 1;
    let currentPage = 1;
    let tmpReservationData = null;
    let reservationUrl = '';
    if (this.role == 1) {
      reservationUrl = `/api/reservation/admin/uaslReservations`;
    } else if (this.role == 2 || this.role == 3) {
      reservationUrl = `/api/reservation/operator/${this.cookie_role.operatorId}/uaslReservations`;
    } else {
      console.log("error: get airway reservation info (permision denied.)");
      this.reservationData = {};
      return;
    }
    let reservationRes = await $fetch(reservationUrl, { 
      method: 'GET',
    });
    console.log(reservationRes);
    if (reservationRes.status != 200) {
      console.error(`error: get airway reservation info {status: ${reservationRes.status}}.`);
      this.reservationData = {};
      return;
    }
    tmpReservationData = reservationRes.data;
    currentPage = 1;
    lastPage = reservationRes.data.lastPage;

    while (currentPage < lastPage) {
      currentPage++;
      let reservationRes = await $fetch(reservationUrl, { 
        method: 'GET',
        query: { page: currentPage }
      });
      console.log(reservationRes);
      if (reservationRes.status != 200) {
        console.error(`error: get airway reservation info {status: ${reservationRes.status}}.`);
        this.reservationData = {};
        return;
      }

      reservationRes.data.result.forEach((reservation) => {
        tmpReservationData.result.push(reservation);
      })
    }

    this.reservationData = tmpReservationData;
    console.log(this.reservationData);
    const tmpreservationList = [];
    let id = 0;
    if (this.reservationData['result'] != undefined) {
      this.reservationData['result'].forEach((reservation) => {
        let airwayId = useAirwayGetAirwayIdFromSectionId(this.chartData, reservation['airwaySections'][0]['airwaySectionId']) // 予約に含まれる航路区画IDをもとに航路IDを特定
        // 航路区画 ID リストと start/end 航路点 ID を算出（detail.vue の航路図表示に必要）
        const sections = reservation['airwaySections'];
        const airwaySectionIds = sections.map(s => s.airwaySectionId);
        const firstSectionId = sections[0]?.airwaySectionId;
        let startJunctionId = '';
        let endJunctionId = '';
        for (const airway of (this.chartData?.airway?.airways ?? [])) {
          const pointIdList = [];
          let matchingJunctionIds = null;
          for (const sec of (airway.airwaySections ?? [])) {
            if (sections.some(s => s.airwaySectionId === sec.airwaySectionId)) {
              for (const pid of (sec.airwayJunctionIds ?? [])) pointIdList.push(pid);
            }
            if (firstSectionId === sec.airwaySectionId) matchingJunctionIds = sec.airwayJunctionIds;
          }
          if (pointIdList.length > 0) {
            let sId = pointIdList[0];
            let eId = pointIdList[pointIdList.length - 1];
            if (sections.length > 1 && matchingJunctionIds && matchingJunctionIds[matchingJunctionIds.length - 1] === eId) {
              [sId, eId] = [eId, sId];
            }
            startJunctionId = String(sId);
            endJunctionId = String(eId);
            break;
          }
        }

        let element = {
          id: id,
          reservationId: reservation['airwayReservationId'],
          airwayId: airwayId,
          reservationStatus: reservation['status'],
          rawReservationStatus: reservation['status'],
          startDay: useDateString1(reservation['airwaySections'][0]['startAt']),
          endDay: useDateString1(reservation['airwaySections'][0]['endAt']),
          dateRange: useDateString1(reservation['airwaySections'][0]['startAt']) + ' ~ ' + useDateString1(reservation['airwaySections'][0]['endAt']),
          reservationNumber: reservation['airwayReservationId'],
          airwayName: useAirwayGetAirwayNameFromAirwayId(this.chartData, airwayId),
          section: useAirwayGetCorridorPointRangeFromSectionIdList(this.chartData, reservation['airwaySections']),
          Departure: useDateString1(reservation['airwaySections'][0]['startAt']),
          Arrival: useDateString1(reservation['airwaySections'][0]['endAt']),
          reservationDay: useDateString2(reservation['reservedAt']),
          updateDay: useDateString2(reservation['updatedAt']),
          purpose: useAirwayGetPurposeFromAirwayId(this.chartData, airwayId),
          operatorId: reservation['operatorId'],
          airwaySectionId: airwaySectionIds,
          startJunctionId: startJunctionId,
          endJunctionId: endJunctionId,
          vehicleId: (reservation['vehicles'] ?? []).map(v => v?.vehicleId).filter(Boolean),
          portFrom: reservation?.ports?.[0]?.name ?? '',
          portTo: reservation?.ports?.[1]?.name ?? '',
          reservationIds: sections.map(s => s.reservationId ?? ''),
          registrationId: reservation?.vehicles?.[0]?.aircraftInfo?.registrationId ?? '',
        };
        tmpreservationList.push(element);
        id++;
      });
    } else {
      console.error(`this.reservationData['result'] undefined(reservationList: ${reservationList})`);
    }
    this.reservationList = tmpreservationList;

    for (let i = 0; i < this.filteredRoutes.length; i++) {
      let airwayName = 'Not found';
      this.reservationList.forEach((reservation) => {
        if (reservation.reservationId == this.filteredRoutes[i].reservationId) {
          airwayName = reservation.airwayName;
          return;
        }
      })
      this.filteredRoutes[i].airwayName = airwayName;
    }
  },
};


</script>

<style>

</style>

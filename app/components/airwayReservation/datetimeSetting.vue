<template>
<!-- 詳細情報 -->
<div id="content" class="b-dateTimeSchedulerContainer">
  <SelectTime 
    @update-dates="updateNewEvent" 
    :airwayName="airwayName" 
    :aircraftId="aircraftId" 
    :aircraftRemoteId="aircraftRemoteId"
    :aircraftInfo="aircraftInfo"
    :airwayId="airwayId"
    :section = "section"
    :sectionIdList="sectionIdList"
    :airwayData="airwayData"
    :start="startJunction" 
    :end="endJunction" 
    :departurePort="departurePort" 
    :arrivalPort="arrivalPort" 
    :departurePortId="departurePortId" 
    :arrivalPortId="arrivalPortId" 
    @add-new-event="handleAddNewEvent" 
    :flag="flag"
  />  
  <!-- カレンダーコントロール -->
  <CalendarDisplayOrchestration
    v-if="airwayData && reservationsLoaded"
    :newEvent="newEvent"
    :reservationData="reservationData"
    :availabilityData="availabilityData"
    :airwayData="airwayData"
    :airwayId="airwayId"
    :start="startJunction"
    :end="endJunction"
    :departurePort="departurePort"
    :arrivalPort="arrivalPort"
    :isEndIdFirst="isEndIdFirst"
    :portHashMap="portHashMap"
    ref="calendarComponent"
    @update-flag="updateFlag"
    :section="section"
  />
</div>
</template>

<script>
import SelectTime from '../components/SelectTime.vue';
import CalendarDisplayOrchestration from '../components/calendarDisplayOrchestration.vue';

export default {
  components: {
    SelectTime,
    CalendarDisplayOrchestration,
  },
  props: ['rangeData'],
  setup() {
    const { portHashMap, selectedAirwayData } = useNewReservationCache();
    return { portHashMap, selectedAirwayData };
  },
  data() {
    return {
      newEvent: {
        departureDate: '',
        departureTime: '',
        arrivalDate: '',
        arrivalTime: '',
      },
      reservationData: [],
      availabilityData: [],

      aircraftId: this.rangeData.aircraftId,
      aircraftRemoteId: this.rangeData.aircraftRemoteId ?? '',
      aircraftInfo: this.rangeData.aircraftInfo,
      airwayName: this.rangeData.airwayName,  
      airwayId: this.rangeData.airwayId,
      section: this.rangeData.section,
      departurePort: this.rangeData.departurePort,
      arrivalPort: this.rangeData.arrivalPort,
      isEndIdFirst: this.rangeData.isEndIdFirst,
      departurePortId: this.rangeData.departurePortId,
      arrivalPortId: this.rangeData.arrivalPortId,
      flag: 0,
      operatorData: null,
      cookie_role: null,
      reservationsLoaded: false,
      role: undefined,
      parentOperatorId: null,
      sectionIds: this.rangeData.sectionIds || '',
      sectionNames: this.rangeData.sectionNames || this.rangeData.section,
    };
  },
  computed: {
    // airwaySetting.vue でエリア選択時に取得した航路データ（自社 + セマンティック他社）を使用。
    // 予約一覧ローダーには依存しない。
    airwayData() {
      return this.selectedAirwayData;
    },
    startJunction() {
      let sectionList = this.section.split(',');
      return sectionList[0];
    },
    endJunction() {
      let sectionList = this.section.split(',');
      return sectionList[sectionList.length-1];
    },
    sectionIdList() {
      return this.sectionRange(); // 既存メソッドをそのまま利用でもOK
    }
  },
  methods: {
    updateNewEvent(dates) {
      this.newEvent = dates;
    },
    handleAddNewEvent(event) {
      this.$refs.calendarComponent.addNewEvent(event);
      console.log(event);
      this.updateDatetime()
    },
    updateDatetime() {
      if(this.flag === 1){
        const departureDate = this.newEvent.departureDate;
        const departureTime = this.newEvent.departureTime;
        const arrivalDate = this.newEvent.arrivalDate;
        const arrivalTime = this.newEvent.arrivalTime;
        this.$emit('update:datetime', departureDate, departureTime, arrivalDate, arrivalTime);
      }else{
        const departureDate = '';
        const departureTime = '';
        const arrivalDate = '';
        const arrivalTime = '';	
        this.$emit('update:datetime', departureDate, departureTime, arrivalDate, arrivalTime);        
      }
    },
    updateFlag(flag) {
      this.flag = flag;
    },
    sectionRange() {
      // 一次元配列にする
      const sectionStr = this.sectionIds || this.section; // ★IDがあればID、なければ名前
      const isIdMode = !!this.sectionIds;
      const sectionList = sectionStr.split(',');

      const sectionIdList = [];

      for (let i = 0; i < sectionList.length - 1; i += 2) {
        const start = sectionList[i];
        const end = sectionList[i + 1];

        for (const targetId of [...new Set(this.airwayId)] || []) {
          const airway = this.airwayData?.airway?.airways?.find(a => a.airwayId === targetId);
          if (!airway) continue;

          // startId / endId を特定
          let startId = '';
          let endId = '';

          if (isIdMode) {
            startId = String(start);
            endId   = String(end);
          } else {
            airway.airwayJunctions.forEach((airwayJunction) => {
              if (airwayJunction.airwayJunctionName === start) startId = airwayJunction.airwayJunctionId;
              if (airwayJunction.airwayJunctionName === end)   endId   = airwayJunction.airwayJunctionId;
            });
          }

          if (!startId || !endId) continue; // ★ここで落とす（以降は既存ロジックそのまま）

            const airwayJunctionIds = airway.airwaySections.map(
              j => j.airwayJunctionIds.map(id => String(id))
            );
            const sId = String(startId);
            const eId = String(endId);

            let index = [];

            // 同一要素内に両方存在
            const sameIndex = airwayJunctionIds.findIndex(pair => pair.includes(sId) && pair.includes(eId));
            if (sameIndex !== -1) {
              index = [sameIndex + 1];
            } else {
              // 最短距離の組み合わせ
              const startIndexes = airwayJunctionIds.map((pair, i) => (pair.includes(sId) ? i : -1)).filter(i => i !== -1);
              const endIndexes = airwayJunctionIds.map((pair, i) => (pair.includes(eId) ? i : -1)).filter(i => i !== -1);

              let bestStart = null;
              let bestEnd = null;
              let minDist = Infinity;
              for (const si of startIndexes) {
                for (const ei of endIndexes) {
                  const dist = Math.abs(si - ei);
                  if (dist < minDist) {
                    minDist = dist;
                    bestStart = si;
                    bestEnd = ei;
                  }
                }
              }

              if (bestStart !== null && bestEnd !== null) {
                const len = Math.abs(bestEnd - bestStart) + 1;
                index = bestStart <= bestEnd
                  ? Array.from({ length: len }, (_, k) => bestStart + k + 1) // 昇順（1始まり）
                  : Array.from({ length: len }, (_, k) => bestStart - k + 1);  // 降順（1始まり）
              }
            }

            console.log('index:', index);

            // index は 1始まりなので 0始まりに補正してセクションIDを取得
            index.forEach((n) => {
              const sec = airway.airwaySections[n - 1];
              if (sec) sectionIdList.push(sec.airwaySectionId);
            });
        }
      }

      return sectionIdList;
    },
  },
  async created() {
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1","2"];
      this.cookie_role = await roleVerification(ownpage_role);
      if (Object.keys(this.cookie_role).length == 0) {
        this.role = null;
        console.log(`airwayReservation get role error.`);
        return;
      }
      // 1:航路運営事業者権限付きユーザかチェック
      const is_Admin = this.cookie_role.roleList.includes("1");
      if (this.cookie_role.virtual_role == 1) {
        // 1:航路運営事業者
        this.role = 1;
      } else if (this.cookie_role.virtual_role == 2){
        this.role = 2;
      } else {
        // 3:関係者またはその他
        this.role = null;
        console.error(`The specified user is not eligible to operate this system.`);
      }
    }
  },
  async mounted() {
    while (this.role === undefined) {
      await new Promise(r => setTimeout(r, 0));
    }
    this.reservationsLoaded = false

    if (typeof window !== 'undefined') {
      this.parentOperatorId = localStorage.getItem('uasl:user:parentOperatorId');
    }
    // 事業者一覧情報を取得
    // try {
    //   const miscApiBaseUrl = useRuntimeConfig().public.miscApiBaseUrl;
    //   const operatorUrl = `${miscApiBaseUrl}/operator`;
    //   const operatorRes = await axios_get(operatorUrl);
    //   if (operatorRes.status === 200 && operatorRes.data != undefined) {
    //     this.operatorData = {};
    //     this.operatorData = operatorRes.data;
    //   } else {
    //     console.error(`error: get operator info {status: ${operatorRes.status}}.`);
    //     return;
    //   }
    // } catch (error) {
    //   console.error('事業者情報一覧の取得に失敗しました(operatorUrl):', error);
    // }

    // 予約URL組み立て
    let reservationUrls = [];

    // 後で使うので外に出す
    let availabilityRes = null;

    if (this.role == 1) {
      reservationUrls.push(`/api/reservation/admin/uaslReservations`);
    } else if (this.role == 2) {
      // airwaySetting.vue のエリア選択時に取得した航路データ（selectedAirwayData）を使用。
      // セマンティックライブラリの再コールは不要。
      const sectionIdList = this.sectionRange();
      const uaslSectionsList = [];

      for (let i = 0; i < sectionIdList.length; i += 1) {
        let foundAirwayId = null;
        for (const airway of (this.airwayData?.airway?.airways ?? [])) {
          for (const airwaySection of airway.airwaySections) {
            if (sectionIdList[i] === airwaySection.airwaySectionId) {
              foundAirwayId = airway.airwayId;
              break;
            }
          }
          if (foundAirwayId) break;
        }
        if (!foundAirwayId) continue;

        uaslSectionsList.push({ uaslId: foundAirwayId, uaslSectionId: sectionIdList[i] });
      }

      if (uaslSectionsList.length > 0) {
        const postJson = {
          uaslSections: uaslSectionsList,
          ...(this.aircraftId ? { vehicles: [{ vehicleId: this.aircraftId }] } : {}),
          ...(this.departurePortId && this.arrivalPortId
            ? { ports: [{ portId: this.departurePortId }, { portId: this.arrivalPortId }] }
            : {}
          ),
        };

        const res = await $fetch('/api/reservation/uaslReservations/availability', {
          method: 'POST',
          body: postJson
        });
        if (res?.status === 200) {
          availabilityRes = res;
        }
      }

      reservationUrls.push(`/api/reservation/operator/${this.parentOperatorId}/uaslReservations`);

    } else {
      console.log("error: get airway reservation info (permision denied.)");
      this.reservationData = {};
      return;
    }

    // ===== 予約情報取得 → this.reservationData 生成 =====
    try {
      const settled = await Promise.allSettled(reservationUrls.map((url) => $fetch(url)));

      const mergedResult = settled.flatMap((s) => {
        if (s.status !== 'fulfilled') return [];
        const res = s.value;
        if (!res || res.status !== 200) return [];
        return Array.isArray(res?.data?.result) ? res.data.result : [];
      });

      const reservationRes = { result: mergedResult };
      this.reservationData = utils.convertUaslToAirwayReservation(reservationRes).result;

      if (Array.isArray(availabilityRes?.data?.result?.uaslSections)) {
        const reservedIdSet = new Set(
          (this.reservationData ?? []).map(r => r?.requestId).filter(Boolean)
        );

        // requestId が null/undefined のセクションも operatorId で自社判定して除外する
        const ownParentOperatorId = this.parentOperatorId;
        availabilityRes.data.result.uaslSections =
          availabilityRes.data.result.uaslSections.filter(sec => {
            const reqId = sec?.requestId;
            if (reqId && reservedIdSet.has(reqId)) return false;
            if (ownParentOperatorId && sec?.operatorId === ownParentOperatorId) return false;
            return true;
          });
      }

      this.availabilityData[0] = availabilityRes?.data?.result ?? [];
    } catch (e) {
      console.error('予約情報取得に失敗しました:', e);
      this.reservationData = [];
    }

    // reservationData の重複排除
    this.reservationData = Array.from(
      new Map(this.reservationData.map(r => [r.requestId, r])).values()
    );

    // airwayData は computed で selectedAirwayData（航路選択画面で取得済み）を返す。
    console.log('airwayData (from airwaySetting):', this.airwayData);

    // データ確定後にカレンダー描画を許可する
    this.reservationsLoaded = true;
  },
};
</script>

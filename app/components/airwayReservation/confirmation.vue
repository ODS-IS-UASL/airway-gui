<template>
  <div class="drn_form__header">
    <div class="drn_form__title">予約内容確認</div>
  </div>

  <!-- 詳細情報 -->
  <v-card-text class="drn_content">
    <div class="drn_content__body">
      <v-sheet class="drn_content__data">
        <!-- 左カラム：リスト -->
        <div class="detailList">
          <table class="drn_table drn_table--reserve_conf">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">予約状況</th>
                <td class="drn_table__data">未申請</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路発着日時</th>
  	            <td class="drn_table__data">
                  <time datetime="2024-10-08">{{ departureDatetime }}</time
                  ><time datetime="10:30">{{ departure }}</time
                  ><span class="e-waveLine">から</span
                  ><time datetime="2024-10-08">{{ arrivalDatetime }}</time
                  ><time datetime="13:00">{{ arrival }}</time>
  	            </td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">飛行目的</th>
                <td class="drn_table__data">{{ purpose.join(", ") }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">航路</th>
                <td class="drn_table__data">{{ airwayName.join(", ") }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">離陸場</th>
                <td class="drn_table__data">{{ departurePort }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">着陸場</th>
                <td class="drn_table__data">{{ arrivalPort }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">DIPS登録記号</th>
                <td class="drn_table__data">{{ aircraftInfo?.registrationId }}</td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">料金</th>
                <td class="drn_table__data">
                  <span v-if="isReservationPending">データ取得中</span>
                  <span v-else>{{ amount }} 円</span>
                </td>
              </tr>
            </tbody>
          </table>

          <v-divider
            class="drn_divider"
          ></v-divider>

          <table class="drn_table drn_table--reserve_conf">
            <tbody>
              <tr class="drn_table__row">
                <th class="drn_table__label">予約区間</th>
                <td class="drn_table__data" v-if="chartData">

                  <!-- #content -->
                  <v-timeline side="end" truncate-line="both" size="x-small" class="drn_timeline drn_timeline--route">
                    <v-timeline-item
                      v-for="(item, index) in combinedList"
                      :key="index"
                      class="routeItem"
                      :style="{
                        '--above-color': item.aboveColor,
                        '--below-color': item.belowColor
                      }"
                    >
                      <template v-slot:icon v-if="index === 0"></template>
                      <template v-slot:icon v-else-if="index === combinedList.length - 1"></template>
                      <span class="drn_timeline__title">{{ item.name }}</span>
                    </v-timeline-item>
                  </v-timeline>
                </td>
                <!-- .drn_table__data -->
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">総距離</th>
                <td class="drn_table__data"><span lang="en">{{ totalDistance }} m</span></td>
              </tr>
              <tr class="drn_table__row">
                <th class="drn_table__label">運航事業者</th>
                <td class="drn_table__data">{{ roleData.operatorName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- .detailList -->
      </v-sheet>
      <!-- .drn_content__data -->

      <!-- 右カラム：マッププレビュー -->
      <v-sheet rounded="lg" color="default" class="drn_content__map--scroll">
        <MapComponent
        v-if="chartData"
          class="confirmationMap"
          :chartData="chartData"
          :sectionList="section.split(',')"
          :sectionJunctionIdList="(sectionIds ? sectionIds.split(',') : [])"
          :airwayId="airwayId"
          :showCheckBox=true
          :showLegend=true
          :showMarker=false
          :departurePort="departurePortDegrees"
          :arrivalPort="arrivalPortDegrees"
          :isEndIdFirst="isEndIdFirst"
          id="Identification"
          :stepNo="stepNo"
        />
      </v-sheet>
      <!-- .drn_content__map -->
    </div>
    <!-- .drn_content__body -->
  </v-card-text>
  <!--/.drn_content -->
</template>

<script>
import MapComponent from '@/components/map/showAirwayReservationConfirmation.vue'; // 修正後のインポート
import { distance } from '@turf/turf';

export default {
  components: {
    MapComponent,
  },
  props: ['rangeData', 'roleData', 'stepNo',],
  setup() {
    // airwaySetting.vue が蓄積した自社＋他社航路データを取得（セマンティックライブラリの再コール不要）
    const { selectedAirwayData } = useNewReservationCache();
    return { selectedAirwayData };
  },
  data() {
    return {
      // 総距離を表示するための値
      totalDistance: "0",
      // グラフやマップに渡すデータ
      chartData: null,
      // ルートパラメータから取得 (this.$route.query で取れる)

      purpose: this.rangeData.purpose,   
      type: this.rangeData.type,  
      airwayName: this.rangeData.airwayName,  
      airwayId: this.rangeData.airwayId,
      aircraftId: this.rangeData.aircraftId,
      aircraftInfo: this.rangeData.aircraftInfo,
      junctionList: this.rangeData.junctionList.value.split(','),
      section: this.rangeData.section,
      formerDatetime: this.rangeData.datetime,
      departureDate: this.rangeData.departureDatetime,
      departure: this.rangeData.departure,
      arrivalDate: this.rangeData.arrivalDatetime,
      arrival: this.rangeData.arrival,
      departurePort: this.rangeData.departurePort,
      arrivalPort: this.rangeData.arrivalPort,
      departurePortId: this.rangeData.departurePortId,
      arrivalPortId: this.rangeData.arrivalPortId,
      departurePortDegrees: this.rangeData.departurePortDegrees,
      arrivalPortDegrees: this.rangeData.arrivalPortDegrees,
      isEndIdFirst: this.rangeData.isEndIdFirst,
      amount: "",
      isReservationPending: true,
      postJsonData: "",
      postDepaturePortJsonData: "",
      postArrivalPortJsonData: "",
      stepNo: this.stepNo,
      parentOperatorId: null,
      sectionIds: this.rangeData.sectionIds || '',
      sectionNames: this.rangeData.sectionNames || this.rangeData.section,
    };
  },
  computed: {
    sectionRange() {
      // 一次元配列にする
      const sectionStr = this.sectionIds || this.section;
      const isIdMode = !!this.sectionIds;
      const sectionList = sectionStr.split(',');

      const sectionIdList = [];

      for (let i = 0; i < sectionList.length - 1; i += 2) {
        const start = sectionList[i];
        const end = sectionList[i + 1];

        for (const targetId of this.airwayId || []) {
          const airway = this.chartData?.airway?.airways?.find(a => a.airwayId === targetId);
          if (!airway) continue;

          // startId / endId を特定
          let startId = '';
          let endId = '';

          if (isIdMode) {
            startId = String(start);
            endId   = String(end);
          } else {
            airway.airwayJunctions.forEach((j) => {
              if (j.airwayJunctionName === start) startId = j.airwayJunctionId;
              if (j.airwayJunctionName === end)   endId   = j.airwayJunctionId;
            });
          }

          if (!startId || !endId) continue;

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
              if (sec) sectionIdList.push(sec.airwaySectionId /* プロパティ名要確認 */);
            });

        }
      }

      return sectionIdList;
    },
    
    departureDatetime() {
      const datetime = new Date(this.departureDate);
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      }).format(datetime);
    },
    arrivalDatetime() {
      const datetime = new Date(this.arrivalDate);
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      }).format(datetime);
    },
    
    combinedList() {
      if (!this.chartData) return [];

      // セクション名（表示用）の配列 — sectionNames は名前専用フィールド、なければ section で代替
      const sectionList = (this.sectionNames || this.section || '').split(',');

      // インデックスごとの色を保持（未割り当ては transparent）
      const colorMap = Array(sectionList.length).fill('transparent');

      const sectionJunctionIds = (this.sectionIds || '').split(',').map(s => s.trim()).filter(Boolean);
      const airwayIds = useAirwayGetAirwayIdListFromSectionIdList(this.chartData, this.sectionRange);
      // airwayId[i] と sectionList[2i], [2i+1] を1区画として色を割り当て
      const segCount = Math.min(
        Array.isArray(airwayIds) ? airwayIds.length : 0,
        Math.floor(sectionList.length / 2)
      );

      for (let seg = 0; seg < segCount; seg++) {
        const targetId = airwayIds[seg];
        const airway = this.chartData?.airway?.airways?.find(a => a.airwayId === targetId);
        if (!airway) continue;
        
        const color = airway.businessNumber
          ? this.operatorColorByBusiness(airway.businessNumber)
          : 'transparent';
          
        const i = seg * 2;
        if (i < colorMap.length) colorMap[i] = color;
        if (i + 1 < colorMap.length) colorMap[i + 1] = color;
      }

      // まとめ処理（奇数始まりペアで同値の場合に一つへ）
      const combined = [];
      let i = 0;
      while (i < sectionList.length) {
        const name = sectionList[i];

        if (i % 2 === 1 && i + 1 < sectionList.length && sectionJunctionIds[i] && sectionJunctionIds[i + 1] && sectionJunctionIds[i] === sectionJunctionIds[i + 1]) {
          combined.push({
            type: 'c-landMarkNameField',
            name,
            // aboveColor は奇数側（若い側）を適用
            aboveColor: colorMap[i] || 'transparent',
            // belowColor は偶数側を適用
            belowColor: colorMap[i + 1] || 'transparent',
          });
          i += 2; // 2要素を1つへまとめたので2つ進める
        } else {
          // 通常の要素（まとめ対象外）
          const color = colorMap[i] || 'transparent';
          const isEven = (i % 2) === 0;
          if (isEven) {
            combined.push({
              type: 'c-landMarkNameField',
              name,
              aboveColor: 'transparent',
              belowColor: color,
            });
          } else {
            combined.push({
              type: 'c-landMarkNameField',
              name,
              aboveColor: color,
              belowColor: 'transparent',
            });
          }
          i += 1;
        }
      }
      return combined;
    },
    operatorColorByBusiness() {
      const palette = useRuntimeConfig().public.colorPalette;
      return (bn) => {
        if (!bn) return '#2F6BFF';
        let h = 0;
        const s = String(bn);
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return palette[h % palette.length];
      };
    },
  },
  methods: {
    startAt() {
      // 要修正。日本で使われるケースのみ想定。
      return useDateStringLocaltoUTC(this.departureDate + 'T' + this.departure + ':00+09:00');
    },
    // 終了日時をISOの形で返す
    endAt() {
      // 要修正。日本で使われるケースのみ想定。
      return useDateStringLocaltoUTC(this.arrivalDate + 'T' + this.arrival + ':00+09:00');
    },
    // 離陸ポートの終了日時をISOの形で返す
    addMinutesToTime(time, minutes) {
      const date = new Date(time);
      date.setMinutes(date.getMinutes() + minutes);
      return date.toISOString(); 
    },
    subtractMinutesFromTime(time, minutes) {
      const date = new Date(time);
      date.setMinutes(date.getMinutes() - minutes);
      return date.toISOString(); 
    },

    // 航路予約データのJSONを作成
    generateJson() {
      let airwaySections = []
      let vehicles = []
      let ports = []
      this.sectionRange.forEach((sectionId, index) => {
        for (const targetId of this.airwayId) {
          const airway = this.chartData?.airway?.airways?.find(a => a.airwayId === targetId);
          if (!airway) continue;
          airway.airwaySections.forEach((airwaySection) => {
            if (sectionId === airwaySection.airwaySectionId){
              airwaySections.push({
                uaslSectionId: sectionId,
                uaslId: airway.airwayId,
                sequence: index + 1,
                startAt: this.startAt(),
                endAt: this.endAt()
              })
            }
          })
        }
      })
      const startAt = this.startAt();
      const endAt = this.endAt();

      const payload = {
        operatorId: this.parentOperatorId,
        ignoreFlightPlanConflict: false,
        uaslSections: airwaySections,
      };

      if(this.aircraftId) {
        payload.vehicles = [
          {
            vehicleId: this.aircraftId,
            aircraftInfo: this.aircraftInfo,
            startAt,
            endAt
          },
        ];
      } else {
        payload.vehicles = [
          {
            aircraftInfo: this.aircraftInfo,
            startAt,
            endAt
          },
        ];
      }

      if (this.departurePortId && this.arrivalPortId) {
        payload.ports = [
          {
            portId: this.departurePortId,
            usageType: 1,
            startAt,
            endAt
          },
          {
            portId: this.arrivalPortId, 
            usageType: 2,
            startAt,
            endAt
          },
        ];
      }

      return payload;
    },
  },
  async mounted() {
    if (typeof window !== 'undefined') {
      this.parentOperatorId = localStorage.getItem('uasl:user:parentOperatorId');
    }
    // airwaySetting.vue のキャッシュ済み航路データ（自社＋他社）をそのまま使用
    this.chartData = this.selectedAirwayData;
    if (!this.chartData?.airway?.airways?.length) {
      this.$emit('update:requestId', null, 0);
      console.error('error: airway data not found in cache.');
      return;
    }

    try {
      this.totalDistance = useAirwayGetDistanceFromSectionIdList(this.chartData, this.sectionRange);
      this.postJsonData = this.generateJson();
      this.$emit('update:postJsonData', this.postJsonData);
    } catch(error) {
      console.error('error: confirmation mounted: ' + error.message);
      this.$emit('update:requestId', null, 0);
      throw error;
    }

    try {
      // 4. 航路予約（仮押さえ）
      const reservationRes = await $fetch('/api/reservation/uaslReservations', { 
        method: 'POST',
        body: this.postJsonData
      });
      if (reservationRes.status !== 200) {
        throw new Error(`4. failed to post airway reservation info, status: ${reservationRes.status}`);
      }
      this.amount = reservationRes?.data?.totalAmount;
      this.$emit('update:requestId', reservationRes?.data?.requestId, reservationRes?.data?.totalAmount);

      console.log("4. airway reservation OK");
    } catch (error) {
      console.error('error: airway reservation: ' + error.message);
      this.$emit('update:requestId', null, 0);
    } finally {
      this.isReservationPending = false;
    }
  },
}

</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* 黒で透過 */
  z-index: 999; /* ダイアログの下に表示 */
}

.c-dialog {
  z-index: 1000; /* オーバーレイの上に表示 */
  position: fixed;
}

.b-twoColumn {
  grid-template-columns: 30% 70%;
}

.subTitle {
  height: 50px;
}

.b-twoColumn {
  grid-template-columns: 40% 60%;
}

.c-labeledList{
  width: 490px;
  overflow-y: scroll;
  height: 60%;
}

.confirmationMap{
  height: 690px !important;
}

#map {
  height: 100%!important;
}

.b-pageHeader {
  height: 115px;
}

.detailList {
  height: 690px;
  overflow-y: scroll;
}

.detailList::-webkit-scrollbar {
  width: 8px;
  background: white;
}

.detailList::-webkit-scrollbar-thumb {
  background-color: #999999;
  border-radius: 5px;
}

/* 上側の線（before） */
.routeItem .v-timeline-divider__before {
  background-color: var(--above-color) !important;
}

/* 下側の線（after） */
.routeItem .v-timeline-divider__after {
  background-color: var(--below-color) !important;
}

/* --- transparent の時だけ border を消す --- */

/* 上側 */
.routeItem[style*="--above-color: transparent"] .v-timeline-divider__before {
  background-color: transparent !important;
  border-color: transparent !important;
}

/* 下側 */
.routeItem[style*="--below-color: transparent"] .v-timeline-divider__after {
  background-color: transparent !important;
  border-color: transparent !important;
}

:deep(.routeItem .v-timeline-divider__before) {
  background-color: var(--above-color) !important;
}

:deep(.routeItem .v-timeline-divider__after) {
  background-color: var(--below-color) !important;
}

:deep(.routeItem[style*="--above-color: transparent"] .v-timeline-divider__before) {
  background-color: transparent !important;
  border-color: transparent !important;
}

:deep(.routeItem[style*="--below-color: transparent"] .v-timeline-divider__after) {
  background-color: transparent !important;
  border-color: transparent !important;
}
</style>

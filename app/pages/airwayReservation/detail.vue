<template>
  <!-- グローバルナビゲーション -->
  <GlobalNavigationRM v-if = "role == 1"/>
  <GlobalNavigation v-if = "role == 2" />
  <GlobalNavigationSH v-if = "role == 3" />

  <!-- コンテンツ -->
  <main class="b-pageMain">
    <div class="b-pageContentHasNavigation">
      <div class="drn_main__app">
        <div variant="flat" class="drn_main__content">

          <!-- ヘッダ -->
          <div class="drn_header">
            <div class="drn_header__item">
              <v-card-title class="drn_header__title">予約詳細</v-card-title>
            </div>
          </div>

          <!-- 詳細情報 -->
          <v-card-text class="drn_content">
            <div class="drn_content__body">
              <!-- 左カラム：リスト -->
              <v-sheet class="drn_content__data" style="overflow-y: auto; max-height: calc(100dvh - 200px);">
                <table class="drn_table drn_table--reserve_conf">
                  <tbody>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">予約番号</th>
                      <td class="drn_table__data">{{ reservationNumber }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">予約状況</th>
                      <td class="drn_table__data">{{ reservationStatus }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">説明</th>
                      <td class="drn_table__data">{{ statusDescription }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">航路発着日時</th>
                      <td class="drn_table__data">{{ convertedDate }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">飛行目的</th>
                      <td class="drn_table__data">{{ purpose }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">航路</th>
                      <td class="drn_table__data">{{ route }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">航路区間</th>
                      <td class="drn_table__data">{{ section }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">DIPS登録記号</th>
                      <td class="drn_table__data">{{ registrationId }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">離陸場：</th>
                      <td class="drn_table__data">{{ portFrom }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">着陸場：</th>
                      <td class="drn_table__data">{{ portTo }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">料金：</th>
                      <td class="drn_table__data">{{ totalAmount }} 円</td>
                    </tr>
                  </tbody>
                </table>
                <v-divider class="drn_divider"></v-divider>
                <table class="drn_table drn_table--reserve_conf">
                  <tbody>
                    <tr class="drn_table__row">
                      <td class="drn_table__data" v-if="chartData">
                        <v-timeline side="end" truncate-line="both" size="x-small" class="drn_timeline drn_timeline--route">
                          <v-timeline-item
                            v-for="(item, index) in combinedList"
                            :key="item.pointKey || `${item.junctionId}-${index}`"
                            class="routeItem"
                            :style="{
                              '--above-color': item.aboveColor,
                              '--below-color': item.belowColor
                            }"
                          >
                            <v-tooltip location="top" open-on-click :open-on-hover="false" :open-on-focus="false">
                              <template #activator="{ props }">
                                <span class="routeClickBand" v-bind="props"></span>
                              </template>

                              <div class="routeTooltipContent">
                                <div v-for="p in tooltipPairs" :key="p.name">
                                  航路名 {{ p.name }}　予約番号 {{ p.id }}
                                </div>
                              </div>
                            </v-tooltip>

                            <template #icon>
                              <span class="routeTooltipDot"></span>
                            </template>

                            <span class="drn_timeline__title">{{ item.name }}</span>
                          </v-timeline-item>
                        </v-timeline>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <v-divider class="drn_divider"></v-divider>
                <table class="drn_table drn_table--reserve_conf">
                  <tbody>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">総距離</th>
                      <td class="drn_table__data">{{ totalDistance }} m</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">運航事業者</th>
                      <td class="drn_table__data">{{ companyName }}</td>
                    </tr>
                    <tr><td class="drn_table__space"></td></tr>
                    <tr class="drn_table__row">
                      <th class="drn_table__label">予約・更新日</th>
                      <td class="drn_table__data">{{ reservationDay }}</td>
                    </tr>
                  </tbody>
                </table>
              </v-sheet>
              <!-- 右カラム：マッププレビュー -->
              <v-sheet rounded="lg" color="default" class="drn_content__map">
                <MapComponent
                  v-if="chartData"
                    :chartData="chartData"
                    :section="section"
                    :airwayId="airwayId"
                    :airwaySectionId="airwaySectionId"
                    :startJunctionId="startJunctionId"
                    :endJunctionId="endJunctionId"
                    class="detailMap"
                    :showCheckBox=true
                    :showLegend=true
                    :showMarker=false
                    @update:isEndIdFirst="handleIsEndIdFirst"
                />
              </v-sheet>
            </div>
          </v-card-text>
        </div>
      </div>
      <!-- .drn_main__app -->
    </div>

    <!-- ページナビゲーション -->
    <PageNavigation :back="true">
      <ul class="e-buttonGroup">
        <li>
          <button class="e-button" @click="changeDialog" v-if="cancelable">予約{{ cancelWord }}</button>
        </li>
      </ul>
    </PageNavigation>
    <div v-if="isOverlayVisible" class="overlay"></div>
    <dialog class="c-dialog" v-if="isDialog1Visible">
      <h2 class="e-dialogTitle">この予約を{{ cancelWord }}すると離発着場の予約も{{ cancelWord }}されます。<br>この予約を{{ cancelWord }}しますか？</h2>
      <ul class="e-buttonGroup">
        <li>
          <button class="e-button-noright" @click="closeDialog">いいえ</button>
        </li>
        <li>
          <button class="e-button-noright" @click="cancelReservation">はい</button>
        </li>
      </ul>
    </dialog>
    <dialog class="c-dialog" v-if="isDialog2Visible">
      <h2 class="e-dialogTitle" v-if="cancelStatus === 'running'">予約の{{ cancelWord }}を実行中です</h2>
      <p v-if="cancelStatus === 'running'">しばらくお待ちください。</p>
      <h2 class="e-dialogTitle" v-if="cancelStatus === 'ok'">予約を{{ cancelWord }}しました</h2>
      <h2 class="e-dialogTitle" style="margin-bottom: 5px" v-if="cancelStatus === 'ng'">予約の{{ cancelWord }}に失敗しました</h2>
      <p v-if="cancelStatus === 'ng'">既に{{ cancelWord }}されていないか予約一覧よりご確認ください。<br>{{ cancelWord }}されていない場合、しばらく時間をあけて再度実行をお願いします。</p>
      <table class="c-labeledList">
        <tbody>
          <tr class="c-labeledListRow">
            <th class="org-listLabel">予約番号：</th>
            <td class="e-listValue">{{ reservationNumber }}</td>
          </tr>
          <tr class="c-labeledListRow">
            <th class="org-listLabel">航路発着日時：</th>
            <td class="e-listValue">{{ convertedDate }}</td>
          </tr>
          <tr class="c-labeledListRow">
            <th class="org-listLabel">航路：</th>
            <td class="e-listValue">{{ route }}</td>
          </tr>
          <tr class="c-labeledListRow">
            <th class="org-listLabel">離陸場：</th>
            <td class="e-listValue">{{ portFrom }}</td>
          </tr>
          <tr class="c-labeledListRow">
            <th class="org-listLabel">着陸場：</th>
            <td class="e-listValue">{{ portTo }}</td>
          </tr>
        </tbody>
      </table>
      <a href="/airwayReservation" class="e-button-noright" v-if="cancelStatus !== 'running'">予約一覧へ戻る</a>
    </dialog>
  </main>
</template>

<script>
import MapComponent from '@/components/map/showAirwayReservationDetail.vue';
// 航路運営者向けサイドバー
import GlobalNavigationRM from "~/components/navigation/globalNavigationRouteManager.vue";
// 運航事業者向けサイドバー
import GlobalNavigation from "~/components/navigation/globalNavigation.vue";
// 関係者向けサイドバー
import GlobalNavigationSH from "~/components/navigation/globalNavigationStakeholder.vue";
import PageNavigation from "~/components/navigation/pageNavigation.vue";

export default {
  components: {
    MapComponent, // MapComponent を登録
    GlobalNavigationRM,
    GlobalNavigation,
    GlobalNavigationSH,
    PageNavigation
  },
  setup() {
    // 予約一覧の航路ローダー共有状態を参照（Stage3完了時に詳細画面も更新するため）
    const { airwayData: loaderAirwayData, airwayDataLoading: loaderAirwayDataLoading } = useAirwayReservationLoader();
    return { loaderAirwayData, loaderAirwayDataLoading };
  },
  data() {
    // data() では reservationNumber のみ query から読む。
    // その他の項目は mounted() でセッションストレージから復元する。
    const q = this.$route.query;
    const toArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
    const routeArr = toArray(q.route);
    return {
      id: q.id ?? '',
      reservationNumber: q.reservationNumber ?? '',
      reservationStatus: q.reservationStatus ?? '',
      rawReservationStatus: q.rawReservationStatus ?? '',
      reservationDay: q.reservationDay ?? '',
      airwayId: toArray(q.airwayId),
      airwayNames: routeArr,
      route: routeArr.length ? [...new Set(routeArr.map(s => String(s).trim()))].join(', ') : '',
      section: q.section ?? '',
      purpose: String(toArray(q.purpose)[0] ?? '').replace(/"/g, ''),
      startDay: q.startDay ?? '',
      endDay: q.endDay ?? '',
      operatorId: q.operatorId ?? '',
      totalDistance: '0',
      chartData: null,
      cookie_role: null,
      role: null,
      companyName: null,
      operatorData: null,
      portFrom: q.portFrom ?? '',
      portTo: q.portTo ?? '',
      isOverlayVisible: false,
      isDialog1Visible: false,
      isDialog2Visible: false,
      cancelable: false,
      cancelStatus: 'initial',
      cancelWord: 'キャンセル',
      isEndIdFirst: false,
      vehicleId: toArray(q.vehicleId).join(', '),
      registrationId: q.registrationId ?? '',
      airwaySectionId: toArray(q.airwaySectionId),
      reservationIds: toArray(q.reservationIds),
      startJunctionId: q.startJunctionId ?? '',
      endJunctionId: q.endJunctionId ?? '',
      totalAmount: q.totalAmount ?? '',
    };
  },
  computed: {
    statusDescription() {
      let result = '';
      try {
        if (!this.reservationStatus) {
          throw new Error('reservationStatus is empty');
        }
        if (!this.rawReservationStatus) {
          throw new Error('rawReservationStatus is empty');
        }
        switch (this.reservationStatus) {
          case '予約済み': 
            result = '予定通り運航可能です。'
            break;
          case '　中止　': 
            if (this.rawReservationStatus == 'CANCELED') {
              result = 'お客様ご自身によるキャンセルです。'
            } else if (this.rawReservationStatus == 'RESCINDED') {
              result = '航路運営者によって撤回されました。'
            } else {
              throw new Error('rawReservationStatus is invalid status');
            }
            break;
          default:
            result = '予約をキャンセルして下さい。'
            break;
        }
      } catch (e) {
        result = '予約状況の取得に失敗しました。しばらく待って再度ご確認ください。';
        console.error('failed to statusDescription:', e);
      }
      return result;
    },
    convertedDate() {
      let result = '';
      try {
        if (!this.startDay) {
          throw new Error('startDay is empty');
        }
        if (!this.endDay) {
          throw new Error('endDay is empty');
        }
        /* 日をまたがない想定 */
        let date = this.startDay.slice(0, 10);
        let startTime = this.startDay.slice(11, 16);
        let endTime = this.endDay.slice(11, 16);
        let dayOfTheWeek = useDateStringGetDayOfTheWeekString(date);
        result = date + ' (' + dayOfTheWeek + ') ' + startTime + ' ~ ' + endTime;
      } catch (e) {
        result = '取得失敗';
        console.error('failed to convertedDate:', e);
      }
      return result;
    },
    combinedList() {
      // 正規化
      const normalizeList = (val) => {
        if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
        if (typeof val === 'string') {
          const s = val.trim();
          if (!s) return [];
          try {
            if (s.startsWith('[')) {
              const arr = JSON.parse(s);
              if (Array.isArray(arr)) return arr.map(v => String(v).trim()).filter(Boolean);
            }
          } catch {}
          return s.split(',').map(v => v.trim()).filter(Boolean);
        }
        return [];
      };

      const pushPoint = (arr, pt) => {
        if (!pt) return;
        const aid = String(pt.airwayId ?? '').trim();
        const jid = String(pt.junctionId ?? '').trim();
        if (!aid || !jid) return;

        // 末尾とjunctionIdが同じなら追加しない（航路が違っても共有点としてまとめる）
        if (arr.length === 0 || String(arr[arr.length - 1].junctionId) !== jid) {
          arr.push({ airwayId: aid, junctionId: jid });
        }
      };

      // junctionId のみの共有判定（※同一航路内のみ有効）
      const sharedJunctionId = (ids1, ids2) => {
        if (!ids1 || !ids2) return null;
        const [a, b] = ids1;
        const [c, d] = ids2;
        if (a === c || a === d) return a;
        if (b === c || b === d) return b;
        return null;
      };

      const otherSide = (ids, p) => {
        const [x, y] = ids;
        if (x === p) return y;
        if (y === p) return x;
        return null;
      };

      const inputSectionIds = normalizeList(this.airwaySectionId);
      const selectedAirwayIds = normalizeList(this.airwayId).map(String);

      const startId = String(this.startJunctionId ?? '').trim();
      const endId   = String(this.endJunctionId ?? '').trim();

      const airways = Array.isArray(this.chartData?.airway?.airways) ? this.chartData.airway.airways : [];
      if (!airways.length || !inputSectionIds.length || !startId || !endId) return [];

      // (airwayId -> (junctionId -> junctionName))
      const idToNameByAirway = new Map();
      // 区画ID -> { airwayId, businessNumber, secId, ids:[j0,j1] }
      const secIdToEntry = new Map();

      airways
        .filter(aw => selectedAirwayIds.length === 0 || selectedAirwayIds.includes(String(aw.airwayId).trim()))
        .forEach(aw => {
          const airwayId = String(aw.airwayId).trim();
          const businessNumber = aw.businessNumber ?? null;

          const idToName = new Map();
          (aw.airwayJunctions || []).forEach(j => {
            const jid = String(j.airwayJunctionId ?? '').trim();
            if (!jid) return;
            idToName.set(jid, j.airwayJunctionName ?? j.name ?? '');
          });
          idToNameByAirway.set(airwayId, idToName);

          (aw.airwaySections || []).forEach(sec => {
            const secId = String(sec.airwaySectionId ?? '').trim();
            if (!secId || !inputSectionIds.includes(secId)) return;

            const ids = (sec.airwayJunctionIds || []).map(x => String(x).trim()).filter(Boolean);
            if (ids.length !== 2) return;

            secIdToEntry.set(secId, { airwayId, businessNumber, secId, ids });
          });
        });

      const orderedEntries = inputSectionIds
        .map(sid => secIdToEntry.get(String(sid).trim()))
        .filter(Boolean);

      if (!orderedEntries.length) return [];

      const chainPoints = [];
      const nSec = orderedEntries.length;
      let lastHandled = false;
      const consumedSecIds = new Set();


      if (nSec === 1) {
        // 1区画予約は素直に start → end の2点だけ
        const onlyAid = orderedEntries[0].airwayId;
        pushPoint(chainPoints, { airwayId: onlyAid, junctionId: startId });
        pushPoint(chainPoints, { airwayId: onlyAid, junctionId: endId });
      } else {
        const first = orderedEntries[0];
        const [a, b] = first.ids;

        if (a !== startId && b !== startId) {
          console.warn('startId is not in first section:', first.secId, first.ids, 'startId=', startId);
        }

        const second = otherSide(first.ids, startId) ?? a;
        pushPoint(chainPoints, { airwayId: first.airwayId, junctionId: startId });
        pushPoint(chainPoints, { airwayId: first.airwayId, junctionId: second });

        for (let i = 1; i <= nSec - 2; i++) {
          const cur = orderedEntries[i];
          if (consumedSecIds.has(cur.secId)) continue;
          const next = orderedEntries[i + 1];
          const [c0, c1] = cur.ids;

          const curAid = cur.airwayId;
          const nextAid = next?.airwayId;

          const prevEnd = chainPoints[chainPoints.length - 1];

          // prevEnd と cur の共有
          if (prevEnd) {
            const prevEndJid = prevEnd.junctionId;
            if (c0 === prevEndJid || c1 === prevEndJid) {
              const out = otherSide(cur.ids, prevEndJid);
              pushPoint(chainPoints, { airwayId: curAid, junctionId: out });
              continue;
            }
          }

          // cur と next の共有
          const sh = sharedJunctionId(cur.ids, next?.ids);
          if (sh != null) {
            const third = otherSide(cur.ids, sh);
            const fifth = otherSide(next.ids, sh);

            pushPoint(chainPoints, { airwayId: curAid, junctionId: third });
            pushPoint(chainPoints, { airwayId: curAid, junctionId: sh });

            const nextIsLast = (i + 1) === (nSec - 1);

            if (nextIsLast) {
              const endInNext = (next.ids[0] === endId || next.ids[1] === endId);
              if (endInNext) {
                // endId が共有点(sh)側なら、そこで終点なので fifth は入れない
                if (endId !== sh) {
                  pushPoint(chainPoints, { airwayId: nextAid, junctionId: endId });
                }
              } else {
                pushPoint(chainPoints, { airwayId: nextAid, junctionId: fifth });
              }

              consumedSecIds.add(next.secId);
              lastHandled = true;
              continue;
            }

            // next が最終でないなら、next は後続との接続判定が必要なのでスキップしない
            pushPoint(chainPoints, { airwayId: nextAid, junctionId: fifth });
            consumedSecIds.add(next.secId);
            continue;
          }

          // 第二区画から見て前後どちらとも共有しない
          //     → 先にある点を先頭とみなす
          pushPoint(chainPoints, { airwayId: curAid, junctionId: cur.ids[0] });
          pushPoint(chainPoints, { airwayId: curAid, junctionId: cur.ids[1] });
        }

        // 最終区画：終了点は endId、反対側を endId-1 の点
        if (!lastHandled) {
          const last = orderedEntries[nSec - 1];
          if (last) {
            const beforeEnd = otherSide(last.ids, endId) ?? last.ids[0];

            pushPoint(chainPoints, { airwayId: last.airwayId, junctionId: beforeEnd });
            pushPoint(chainPoints, { airwayId: last.airwayId, junctionId: endId });
          }
        }
      }

      const bnByEdge = new Map();
      const edgeKey = (x, y) => {
        const sx = String(x).trim();
        const sy = String(y).trim();
        if (!sx || !sy) return '';
        const [p, q] = [sx, sy].sort();
        return `${p}|${q}`;
      };

      airways
        .filter(aw => selectedAirwayIds.length === 0 || selectedAirwayIds.includes(String(aw.airwayId).trim()))
        .forEach(aw => {
          const airwayId = String(aw.airwayId).trim();
          const bn = aw.businessNumber ?? null;

          (aw.airwaySections || []).forEach(sec => {
            const ids = (sec.airwayJunctionIds || []).map(x => String(x).trim()).filter(Boolean);
            if (ids.length === 2) bnByEdge.set(edgeKey(ids[0], ids[1]), bn);
          });
        });

      const combined = chainPoints.map((pt, i) => {
        const curAid = pt.airwayId;
        const curJid = pt.junctionId;

        const prev = i > 0 ? chainPoints[i - 1] : null;
        const next = i < chainPoints.length - 1 ? chainPoints[i + 1] : null;

        // 前後が別航路なら「線でつながれない」＝transparent（既存ルール維持）
        const aboveBn = prev ? (bnByEdge.get(edgeKey(prev.junctionId, curJid)) ?? null) : null;
        const belowBn = next ? (bnByEdge.get(edgeKey(curJid, next.junctionId)) ?? null) : null;

        const name = idToNameByAirway.get(curAid)?.get(curJid) ?? '';

        const pointKey = (airwayId, junctionId) => `${String(airwayId).trim()}|${String(junctionId).trim()}`;

        return {
          // テンプレート key は本来これ推奨（別航路のjunctionId衝突回避）
          pointKey: pointKey(curAid, curJid),

          airwayId: curAid,
          junctionId: curJid,
          type: 'c-landMarkNameField',
          name,

          aboveColor: aboveBn ? this.operatorColorByBusiness(aboveBn) : 'transparent',
          belowColor: belowBn ? this.operatorColorByBusiness(belowBn) : 'transparent',
        };
      });

      let total = 0;
      for (const e of orderedEntries) {
        total += useAirwayGetDistanceFromJunctionIdList(this.chartData, e.airwayId, e.ids);
      }
      this.totalDistance = total;

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
    tooltipPairs() {
      const toArray = (v) => {
        if (Array.isArray(v)) return v;
        if (v == null) return [];
        return [v];
      };

      const names = toArray(this.airwayNames).map(v => String(v ?? '').trim());
      const ids   = toArray(this.reservationIds).map(v => String(v ?? '').trim());

      const n = Math.min(names.length, ids.length);

      const seen = new Set();   // 航路名で重複チェック
      const out = [];

      for (let i = 0; i < n; i++) {
        const name = names[i];
        const id = ids[i];

        if (!name) continue;          // 航路名が空は表示しない
        if (seen.has(name)) continue; // 航路名が同じものは2件目以降を捨てる

        seen.add(name);
        out.push({ name, id });
      }

      return out;
    },
  },
  methods: {
    closeDialog() {
      this.isOverlayVisible = false;
      this.isDialog1Visible = false;
      this.isDialog2Visible = false;
      this.cancelStatus = "initial";
    },
    changeDialog() {
      this.isOverlayVisible = true;
      this.isDialog1Visible = true;
      this.isDialog2Visible = false;
      this.cancelStatus = "initial";
    },
    async cancelReservation() {
      // 0. 表示をキャンセル処理実行中に遷移
      this.isOverlayVisible = true;
      this.isDialog1Visible = false;
      this.isDialog2Visible = true;
      this.cancelStatus = "running";

      // 1. 初期化
      let cancelFailed = false;
      let reservationNumber = await this.reservationNumber;
      const operatorId = await this.cookie_role.operatorId;
      console.log('1. reservationNumber:', reservationNumber, 'operatorId:', operatorId);
      let operatorIdFrom = '';
      let operatorIdTo = '';
      let res;

      try {
        // 6. 航路予約ID の状態の取得
        res = await $fetch(`/api/reservation/uaslReservations/${reservationNumber}`, { 
          method: 'GET',
        });
        if (res.status !== 200) {
          throw new Error(`6. failed to airwayReservations(${urlAirRsv}), ${res.status}`);
        }
        const rsvStatus = res.data.status;
        console.log('6. rsvStatus:', rsvStatus);

        // 7. キャンセル/撤回
        if ((rsvStatus == 'CANCELED') || (rsvStatus == 'RESCINDED')) {
          // キャンセル/撤回済みであれば、キャンセル/撤回操作は行わない
          console.log('7. airway already canceled:', reservationNumber);
        } else {
          if (this.role == 1) { // 航路運営者: 撤回
            res = await $fetch(`/api/reservation/admin/uaslReservations/${reservationNumber}/rescind`, { 
              method: 'PUT',
            });
            if (res.status !== 200) {
              throw new Error(`7. failed to tekkai(${urlTekkai}), ${res.status}`);
            }
            console.log('7. tekkai succeeded.');
          } else if (this.role == 2) { // 運航事業者: キャンセル
            res = await $fetch(`/api/reservation/uaslReservations/${reservationNumber}/cancel`, { 
              method: 'PUT',
            });
            if (res.status !== 200) {
              throw new Error(`7. failed to cancel(${urlCancel}), ${res.status}`);
            }
            console.log('7. cancel succeeded.');
          }
        }
      } catch (cerr) {
        console.error('failed to cancelReservation:', cerr);
        cancelFailed = true;
      } finally {
        this.cancelStatus = (cancelFailed) ? "ng" : "ok";
      }
    },
    async getCancelable() {
      let cancelable = false;
      const role = await this.role;

      if (role == 1 || role == 2) {
        const rsvStat = await this.rawReservationStatus;
        cancelable = (rsvStat !== 'CANCELED' && rsvStat !== 'RESCINDED');
      }

      console.log('cancelable(1st):', cancelable);
      return cancelable;
    },
    handleIsEndIdFirst(value) {
      this.isEndIdFirst = value;
    },
    updateRouteFromLoader() {
      const LOADING = 'データ取得中';
      const loaderData = this.loaderAirwayData;
      if (!loaderData?.airway?.airways?.length) return;
      // 航路名がまだ「データ取得中」の場合はローダーのデータで更新
      const rawRoute = String(this.route ?? '');
      if (rawRoute === LOADING || rawRoute.includes(LOADING)) {
        const airwayIds = Array.isArray(this.airwayId) ? this.airwayId : (this.airwayId ? [this.airwayId] : []);
        const names = airwayIds
          .map(id => loaderData.airway.airways.find(aw => String(aw.airwayId) === String(id)))
          .filter(Boolean)
          .map(aw => aw.airwayName ?? aw.name ?? '')
          .filter(Boolean);
        if (names.length > 0) {
          this.route = [...new Set(names)].join(', ');
          // 航路名リストも更新
          this.airwayNames = [...new Set(names)];
        }
      }
      // 区間がまだ「データ取得中」の場合はローダーのデータから充当の判断を再試
      const rawSection = String(this.section ?? '');
      if (rawSection === LOADING || rawSection.includes(LOADING)) {
        const sectionIds = Array.isArray(this.airwaySectionId)
          ? this.airwaySectionId.map(String)
          : (this.airwaySectionId ? [String(this.airwaySectionId)] : []);
        const airwayIds = Array.isArray(this.airwayId) ? this.airwayId : (this.airwayId ? [this.airwayId] : []);
        if (sectionIds.length > 0) {
          const getJunctionsFromLoader = (sectionId) => {
            for (const aw of loaderData.airway.airways) {
              if (airwayIds.length && !airwayIds.some(id => String(id) === String(aw.airwayId))) continue;
              const sec = (aw.airwaySections ?? []).find(s => String(s.airwaySectionId) === sectionId);
              if (!sec) continue;
              return (aw.airwayJunctions ?? []).filter(j =>
                (sec.airwayJunctionIds ?? []).includes(j.airwayJunctionId)
              );
            }
            return [];
          };
          let startJunction = null, endJunction = null;
          if (sectionIds.length === 1) {
            const js = getJunctionsFromLoader(sectionIds[0]);
            startJunction = js[0] ?? null;
            endJunction = js[js.length - 1] ?? null;
          } else {
            const firstJs = getJunctionsFromLoader(sectionIds[0]);
            const secondJs = getJunctionsFromLoader(sectionIds[1]);
            const lastJs = getJunctionsFromLoader(sectionIds[sectionIds.length - 1]);
            const secondLastJs = getJunctionsFromLoader(sectionIds[sectionIds.length - 2]);
            const secondIds = secondJs.map(j => j.airwayJunctionId);
            const secondLastIds = secondLastJs.map(j => j.airwayJunctionId);
            startJunction = firstJs.find(j => !secondIds.includes(j.airwayJunctionId)) ?? firstJs[0] ?? null;
            endJunction = lastJs.find(j => !secondLastIds.includes(j.airwayJunctionId)) ?? lastJs[lastJs.length - 1] ?? null;
          }
          if (startJunction && endJunction) {
            const sn = startJunction.airwayJunctionName ?? startJunction.name ?? '';
            const en = endJunction.airwayJunctionName ?? endJunction.name ?? '';
            this.section = `${sn} ~ ${en}`;
            if (!this.startJunctionId) this.startJunctionId = startJunction.airwayJunctionId ?? '';
            if (!this.endJunctionId) this.endJunctionId = endJunction.airwayJunctionId ?? '';
          }
        }
      }
    },
  },
  watch: {
    loaderAirwayDataLoading(newVal) {
      // Stage3 完了時（false に変化）に予約詳細画面の航路名・区間を反映
      if (!newVal) {
        this.updateRouteFromLoader();
      }
    },
  },
  async created() {
    if (process.client) {
      // ロールチェック
      const ownpage_role = ["1","2","3"];
      this.cookie_role = await roleVerification(ownpage_role);
      if (Object.keys(this.cookie_role).length == 0) {
        console.error(`airwayReservation get role error.`);
        return;
      }
      switch (this.cookie_role.virtual_role) {
        case "1":
          this.role = 1;  // 航路運営者
          this.cancelWord = "撤回";
          break;
        case "2":
          this.role = 2;  // 運航事業者
          this.cancelWord = "キャンセル";
          break;
        case "3":
          this.role = 3; // 関係者
          break;
        default:
          this.role = null;
          break;
      }
      console.log(`virtual_role: ${this.cookie_role.virtual_role}, role: ${this.role}`);
    }
  },
  async mounted() {
    // ── セッションストレージから予約詳細データを復元 ──────────────────────────
    // RouteReservationItemList.vue の openDetail() が reservationNumber をキーに
    // 予約情報 + 航路データを保存しているので、それを読み込んで chartData を設定する。
    // セッションストレージになければ従来の API 呼び出し（searchUaslsFromID）で取得する。
    if (process.client && this.reservationNumber) {
      try {
        const raw = sessionStorage.getItem(`rsv:detail:${this.reservationNumber}`);
        if (raw) {
          const stored = JSON.parse(raw);
          const item = stored.item ?? {};
          const toArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);

          this.id                  = item.id ?? this.id;
          this.airwayId            = toArray(item.airwayId).length ? toArray(item.airwayId) : this.airwayId;
          this.airwayNames         = toArray(item.name);
          this.route               = toArray(item.name).length
            ? [...new Set(toArray(item.name).map(s => String(s).trim()))].join(', ')
            : this.route;
          this.section             = item.section ?? this.section;
          this.purpose             = item.purpose !== undefined
            ? String(toArray(item.purpose)[0] ?? '').replace(/"/g, '')
            : this.purpose;
          this.startDay            = item.startDay ?? this.startDay;
          this.endDay              = item.endDay   ?? this.endDay;
          this.operatorId          = item.operatorId ?? this.operatorId;
          this.reservationStatus   = item.reservationStatus    ?? this.reservationStatus;
          this.rawReservationStatus = item.rawReservationStatus ?? this.rawReservationStatus;
          this.reservationDay      = item.reservationDay ?? this.reservationDay;
          this.vehicleId           = toArray(item.vehicleId).join(', ') || this.vehicleId;
          this.portFrom            = item.portFrom ?? this.portFrom;
          this.portTo              = item.portTo   ?? this.portTo;
          this.registrationId      = item.registrationId ?? this.registrationId;
          this.airwaySectionId     = toArray(item.airwaySectionId).length ? toArray(item.airwaySectionId) : this.airwaySectionId;
          this.reservationIds      = toArray(item.reservationIds).length  ? toArray(item.reservationIds)  : this.reservationIds;
          this.startJunctionId     = item.startJunctionId ?? this.startJunctionId;
          this.endJunctionId       = item.endJunctionId   ?? this.endJunctionId;
          this.totalAmount         = item.totalAmount ?? this.totalAmount;

          if (stored.airwayData) {
            this.chartData = stored.airwayData;
          }
        }
      } catch (e) {
        console.warn('[detail] sessionStorage read failed:', e);
      }
    }

    // ── chartData が未設定の場合のみ API で取得（フォールバック） ────────────
    if (!this.chartData) {
      let uaslData;
      try {
        uaslData = await searchUaslsFromID(this.airwayId);
        if(uaslData.uasl.length == 0) {
          console.error(`error: target uasl nothing.`);
          this.chartData = {};
          return;
        }
      }
      catch(error) {
        console.error(`error: get uasl info: ${error.message}`);
        this.chartData = {};
        return;
      }
      const uaslResData = utils.convertUaslToAirway(uaslData);
      this.chartData = useAirwayConvertConnectionOrder(uaslResData);
    }

    // chartData 取得後、"データ取得中" だった航路名・区間を更新する
    const LOADING = 'データ取得中';
    if (this.route === LOADING && this.chartData?.airway?.airways) {
      const airwayIds = Array.isArray(this.airwayId) ? this.airwayId : (this.airwayId ? [this.airwayId] : []);
      const names = airwayIds
        .map(id => this.chartData.airway.airways.find(aw => String(aw.airwayId) === String(id))?.airwayName)
        .filter(Boolean);
      this.route = [...new Set(names)].join(', ') || LOADING;
    }

    if (this.section === LOADING || !this.startJunctionId) {
      // chartData から区間（開始航路点 ~ 終了航路点）を算出する
      const sectionIds = Array.isArray(this.airwaySectionId)
        ? this.airwaySectionId.map(String)
        : (this.airwaySectionId ? [String(this.airwaySectionId)] : []);
      if (sectionIds.length > 0 && this.chartData?.airway?.airways) {
        const getJunctions = (sectionId) => {
          for (const airway of this.chartData.airway.airways) {
            const sec = airway.airwaySections.find(s => String(s.airwaySectionId) === sectionId);
            if (!sec) continue;
            return airway.airwayJunctions.filter(j => sec.airwayJunctionIds.includes(j.airwayJunctionId));
          }
          return [];
        };
        let startJunction = null, endJunction = null;
        if (sectionIds.length === 1) {
          const junc = getJunctions(sectionIds[0]);
          startJunction = junc[0] ?? null;
          endJunction = junc[junc.length - 1] ?? null;
        } else {
          const firstJunc  = getJunctions(sectionIds[0]);
          const secondJunc = getJunctions(sectionIds[1]);
          const lastJunc       = getJunctions(sectionIds[sectionIds.length - 1]);
          const secondLastJunc = getJunctions(sectionIds[sectionIds.length - 2]);
          const secondIds     = secondJunc.map(j => j.airwayJunctionId);
          const secondLastIds = secondLastJunc.map(j => j.airwayJunctionId);
          startJunction = firstJunc.find(j => !secondIds.includes(j.airwayJunctionId))
            ?? firstJunc[0] ?? null;
          endJunction = lastJunc.find(j => !secondLastIds.includes(j.airwayJunctionId))
            ?? lastJunc[lastJunc.length - 1] ?? null;
        }
        if (startJunction && endJunction) {
          const startName = startJunction.airwayJunctionName ?? startJunction.name ?? '';
          const endName   = endJunction.airwayJunctionName   ?? endJunction.name   ?? '';
          this.section = `${startName} ~ ${endName}`;
          if (!this.startJunctionId) this.startJunctionId = startJunction.airwayJunctionId ?? '';
          if (!this.endJunctionId)   this.endJunctionId   = endJunction.airwayJunctionId   ?? '';
        }
      }
    }

    // DIPS登録記号取得
    // DIPS登録記号取得（registrationId が空の場合のみ API から取得）
    this.registrationId = String(this.registrationId ?? '').trim();

    if (!this.registrationId) {
      const tmpRegistrationId = [];

      // vehicleId を安全に正規化（配列/文字列/undefined 対応）
      const vehicleIdList = Array.isArray(this.vehicleId)
        ? this.vehicleId
        : (this.vehicleId ? [this.vehicleId] : []);

      this.vehicleId = [...new Set(vehicleIdList.map(s => String(s).trim()).filter(Boolean))].join(", ");
        for(let vId of this.vehicleId.split(', ').filter(Boolean)) {
          try {
            const aircraftRes = await $fetch(`/api/drone/aircraft/info/detail/${vId}`, { 
              method: 'GET',
              query: {
                isRequiredPriceInfo: false,
                isRequiredPayloadInfo: false,
              }
            });
            if (!utils.isNormalStatusResponse(aircraftRes.status)) {
              return false;
            }
            tmpRegistrationId.push(aircraftRes.data.dipsRegistrationCode);
          } catch(error) {
            console.error(`error: get registrationId: ${error}`);
            return;
          }
        }
      this.registrationId = [...new Set(tmpRegistrationId)].join(', ');
    }

    // 事業者一覧情報を取得
    /* ★ GET /operator 廃止：暫定対応（取得部コメント化）
    const miscApiBaseUrl = useRuntimeConfig().public.miscApiBaseUrl;
    const operatorUrl = `${miscApiBaseUrl}/operator`;
    const operatorRes = await axios_get(operatorUrl);
    if (operatorRes.status === 200 && operatorRes.data != undefined) {
      this.operatorData = {};
      this.operatorData = operatorRes.data;
    } else {
      console.error(`error: get operator info {status: ${operatorRes.status}}.`);
      return;
    }
    */
    // ユーザ属性キャッシュを取得して companyName を解決
    await initUserAttrCache();
    this.companyName = getcompanyName(this.operatorData, this.operatorId);

    // 航路予約ID から ポート予約ID の取得
    // /api/getDronePortReservationIdFrom はDBを使っており、使わなくなったため必ず失敗する
    // let res = await axios_get('/api/getDronePortReservationIdFrom', {id: this.reservationNumber}, {});
    // if (res.status !== 200) {
    //   return false;
    // }
    // return false;

    // const portIdFrom = res.data.idFrom; // ポート予約ID
    // const portIdTo = res.data.idTo;     // ポート予約ID

    // if (portIdFrom !== '' && portIdTo !== '') {
    //   this.getCancelable()
    //   .then(cancelable => {
    //     this.cancelable = cancelable;
    //     console.log('cancelable(fix):', this.cancelable,
    //                 'rawReservationStatus:', this.rawReservationStatus);
    //   })
    // }
    this.getCancelable()
    .then(cancelable => {
      this.cancelable = cancelable;
      console.log('cancelable(fix):', this.cancelable,
                  'rawReservationStatus:', this.rawReservationStatus);
    })
  },
}
</script>

<style>
.b-twoColumn {
  grid-template-columns: 40% 60%;
}

.c-labeledList {
  overflow-y: scroll;
}

.c-labeledListRow {
  width: 35px;
  
}

.detailMap {
  height: calc(100dvh - 280px) !important;
}

.b-pageHeader {
  height: 115px;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.c-dialog {
  z-index: 1000;
  position: fixed;
  height: 60%;
  width: 80%;
}

.org-listLabel {
  width: 250px;
  padding-right: 1rem;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  opacity: 1;
  height: 2rem;
  vertical-align: middle;
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

.routeTooltipDot{
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: #fff;
  border: 2px solid #9e9e9e;
  display: inline-block;
}

/* divider を基準に absolute する */
.routeItem .v-timeline-divider {
  position: relative;
}

.routeItem .v-timeline-divider__dot {
  position: static !important;
  overflow: visible !important;
}

/* 線の縦列だけを覆う */
.routeHoverTarget {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
}

.routeItem .v-timeline-divider__before,
.routeItem .v-timeline-divider__after {
  pointer-events: none;
}

/* divider の高さが詰まっている場合に、線領域に追従させる */
.routeItem .v-timeline-divider {
  height: 100%;
}


.routeItem {
  position: relative;
}

/* divider列（線＋点がある縦列）に重なる透明帯 */
.routeClickBand {
  position: absolute;
  top: 0;
  bottom: 0;

  left: 0;
  width: 48px;

  z-index: 20;
  cursor: pointer;
  background: transparent;
}
</style>

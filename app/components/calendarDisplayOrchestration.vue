<template>
  <div>
    <FullCalendar ref="fullCalendarRef" :options="calendarOptions"/>
    <div v-if="showPopup" ref="popupRef" class="popup" :style="popupStyle">
      <p>{{ popupEvent.title }}</p>
      <p>{{ popupEvent.start }}~{{ popupEvent.end }}</p>
      <p v-if="popupEvent.classNames === 'aiway-all'">航路: {{ popupEvent.airwayName }}</p>
      <p v-if="popupEvent.classNames === 'aiway-all'">離陸場: ---</p>
      <p v-if="popupEvent.classNames === 'aiway-all'">着陸場: ---</p>

      <p v-if="popupEvent.classNames === 'airway-port-all'">航路: {{ popupEvent.airwayName }}</p>
      <p v-if="popupEvent.classNames === 'airway-port-all'">離陸場: {{ popupEvent.departurePort }}</p>
      <p v-if="popupEvent.classNames === 'airway-port-all'">着陸場: {{ popupEvent.arrivalPort }}</p>

      <p v-if="popupEvent.classNames === 'airway-port-departure'">航路: {{ popupEvent.airwayName }}</p>
      <p v-if="popupEvent.classNames === 'airway-port-departure'">離陸場: {{ popupEvent.departurePort }}</p>
      <p v-if="popupEvent.classNames === 'airway-port-departure'">着陸場: ---</p>

      <p v-if="popupEvent.classNames === 'airway-port-arrival'">航路: {{ popupEvent.airwayName }}</p>
      <p v-if="popupEvent.classNames === 'airway-port-arrival'">離陸場: ---</p>
      <p v-if="popupEvent.classNames === 'airway-port-arrival'">着陸場: {{ popupEvent.arrivalPort }}</p>

      <p v-if="popupEvent.classNames === 'port-all'">航路: ---</p>
      <p v-if="popupEvent.classNames === 'port-all'" >離陸場: {{ popupEvent.departurePort }}</p>
      <p v-if="popupEvent.classNames === 'port-all'">着陸場: {{ popupEvent.arrivalPort }}</p>

      <!-- 他社予約（availabilityData 由来） -->
      <template v-if="popupEvent.classNames === 'other-reservation'">
        <p v-if="popupEvent.airwayName && popupEvent.airwayName !== '---'">航路: {{ popupEvent.airwayName }}</p>
        <p v-if="popupEvent.departurePort && popupEvent.departurePort !== '---'">離陸場: {{ popupEvent.departurePort }}</p>
        <p v-if="popupEvent.arrivalPort && popupEvent.arrivalPort !== '---'">着陸場: {{ popupEvent.arrivalPort }}</p>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';

export default {
  components: {
    FullCalendar,
  },
  props: {
    newEvent: {
      type: Object,
      required: true
    },
    reservationData: {
      type: Array,
      required: true
    },
    availabilityData: {
      type: Array,
      required: true
    },
    airwayData: {
      type: Object,
      required: true
    },
    airwayId: {
      type: String,
      required: true
    },
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    },
    departurePort: {
      type: String,
      required: true
    },
    arrivalPort: {
      type: String,
      required: true
    },
    isEndIdFirst: {
      type: Boolean,
      required: true
    },
    section: {
      type: String,
      required: true
    },
    // portId → { portName } のハッシュマップ（airwaySetting で構築・useNewReservationCache 経由で受け取る）
    portHashMap: {
      type: Object,
      default: () => ({})
    },
  },
  setup(props, { expose, emit  }) {
    const dialogVisible = ref(false);
    const newEvent = ref({ title: '', start: '', end: '', color: '' });
    const events = ref([]);
    const operatorData = ref(null);

    const reserveList = []; // 自社予約（競合分のみ）

    const loadEvent = async (start, end) => {
      reserveList.length = 0;
      if (props.isEndIdFirst) [start, end] = [end, start];

      // sectionList は「自社予約の競合チェック」にのみ使う（従来通り）
      const sectionList = useAirwayGetSectionIdListFromCorridorPointList(
        props.airwayData,
        props.section.split(','),
        props.airwayId
      );

      // 事業者一覧取得（自社・他社ともに事業者名表示に使う）
      // const miscApiBaseUrl = useRuntimeConfig().public.miscApiBaseUrl;
      // const operatorUrl = `${miscApiBaseUrl}/operator`;
      // const operatorRes = await axios_get(operatorUrl);
      // if (operatorRes.status !== 200 || operatorRes.data == undefined) return;
      // operatorData.value = operatorRes.data;

      // ---------- 自社予約（reservationData）：従来通り 競合チェックして表示 ----------
      props.reservationData.forEach((reserve, index) => {
        let hitReserve = false;
        (reserve.airwaySections ?? []).forEach((section) => {
          if (sectionList.includes(section.airwaySectionId)) hitReserve = true;
        });

        if (hitReserve && reserve.status === "RESERVED") {
          reserveList.push({ ...reserve, index });
        }
      });

      reserveList.forEach((reserve) => {
        const startAt = reserve.airwaySections[0].startAt;
        const endAt = reserve.airwaySections[reserve.airwaySections.length - 1].endAt;
        const resolvedName = getcompanyName(operatorData.value, reserve.operatorId);
        const companyName = (resolvedName === 'Not found' || resolvedName === 'Not found.')
          ? '自社'
          : resolvedName;

        const departurePort = reserve.ports?.[0]?.name ?? '';
        const arrivalPort = reserve.ports?.[1]?.name ?? '';

        let classNames = 'aiway-all';
        if (departurePort && arrivalPort) classNames = 'airway-port-all';
        else if (departurePort && !arrivalPort) classNames = 'airway-port-departure';
        else if (!departurePort && arrivalPort) classNames = 'airway-port-arrival';

        const flightPurpose = reserve.flightPurpose ?? '';

        // 自社予約済み枠
        events.value.push({
          id: `reservation:${reserve.requestId}`,
          title: companyName,
          start: useDateStringUTCtoLocal(startAt).slice(0, 19),
          end: useDateStringUTCtoLocal(endAt).slice(0, 19),
          color: '#81B0FC1F',
          textColor: '#333333',
          classNames,
          extendedProps: {
            source: 'reservation',
            reservationIndex: reserve.index,   // ← popup等で reservationData を引くため
            requestId: reserve.requestId,
            departurePort,
            arrivalPort,
            flightPurpose,
          }
        });
      });

      // ---------- 他社予約（availabilityData）：競合済みなのでチェック不要、そのまま表示 ----------
      (props.availabilityData ?? []).forEach((a) => {
        (a.uaslSections ?? []).forEach((sec) => {
          const resolvedName = getcompanyName(operatorData.value, sec.operatorId);
          const companyName = (resolvedName === 'Not found' || resolvedName === 'Not found.')
            ? (sec.flightPurpose ?? '他社予約')
            : resolvedName; // ★ 事業者名表示（取得できない場合は飛行目的を表示）

          // uaslId → 航路名 の解決（loaderAirwayData から取得）
          let airwayName = '---';
          if (sec.uaslId) {
            const aw = props.airwayData?.airway?.airways?.find(a => a.airwayId === sec.uaslId);
            if (aw?.airwayName) airwayName = aw.airwayName;
          }

          // portId → ポート名 の解決（portHashMap または embeddedの portName を優先）
          let departurePort = '---';
          let arrivalPort = '---';
          if (Array.isArray(sec.ports)) {
            const dep = sec.ports.find(p => p.usageType === 1);
            const arr = sec.ports.find(p => p.usageType === 2);
            if (dep) {
              departurePort = dep.portName ||
                (dep.portId ? (props.portHashMap?.[dep.portId]?.portName ?? '---') : '---');
            }
            if (arr) {
              arrivalPort = arr.portName ||
                (arr.portId ? (props.portHashMap?.[arr.portId]?.portName ?? '---') : '---');
            }
          }

          // 他社予約済み枠
          events.value.push({
            id: `availability:${sec.requestId}`,
            title: companyName,
            start: useDateStringUTCtoLocal(sec.startAt).slice(0, 19),
            end: useDateStringUTCtoLocal(sec.endAt).slice(0, 19),
            color: '#0E8C851A',
            textColor: '#333333',
            classNames: ['other-reservation'],
            extendedProps: {
              source: 'availability',
              requestId: sec.requestId,
              operatorId: sec.operatorId,
              airwayName,
              departurePort,
              arrivalPort,
            }
          });
        });
      });
    };

    const currentView = ref('timeGridWeek');
    const fullCalendarRef = ref(null);
    const popupRef = ref(null)

    const showPopup = ref(false);
    const popupEvent = ref({});
    const popupStyle = ref({});
    const popupElement = ref(null);

    const calendarBodyTop = ref(0);

    const handleEventMouseEnter = async (info) => {
      const extractTime = (dateObj) => {
        if (!dateObj) return '--:--';
        const date = new Date(dateObj);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      const startTime = extractTime(info.event.start);
      const endTime = extractTime(info.event.end);

      const source = info.event.extendedProps?.source; // 'reservation' | 'availability'
      const classNamesStr = Array.isArray(info.event.classNames)
        ? info.event.classNames.join(' ')
        : String(info.event.classNames || '');

      // デフォルト（他社予約は基本情報のみ）
      let airwayName = '---';
      let departurePort = '---';
      let arrivalPort = '---';

      // 自社予約のみ：航路名/ポート情報を表示
      if (source === 'reservation') {
        const idx = info.event.extendedProps?.reservationIndex;
        const r = (typeof idx === 'number') ? props.reservationData?.[idx] : null;

        departurePort = info.event.extendedProps?.departurePort || '---';
        arrivalPort = info.event.extendedProps?.arrivalPort || '---';

        if (r?.airwaySections?.length) {
          const airwayNames = r.airwaySections
            .map(s => useAirwayGetAirwayIdFromSectionId(props.airwayData, s.airwaySectionId))
            .filter(Boolean)
            .map(id => useAirwayGetAirwayNameFromAirwayId(props.airwayData, id))
            .filter(Boolean);

          airwayName = [...new Set(airwayNames)].join(', ') || '---';
        }
      }

      // 他社予約：extendedProps に格納済みの解決済み情報を使用
      if (source === 'availability') {
        airwayName = info.event.extendedProps?.airwayName || '---';
        departurePort = info.event.extendedProps?.departurePort || '---';
        arrivalPort = info.event.extendedProps?.arrivalPort || '---';
      }

      // popup表示内容
      popupEvent.value = {
        title: info.event.title,          // 自社も他社も「事業者名」を title に入れている前提
        start: startTime,
        end: endTime,
        classNames: classNamesStr,
        airwayName,
        departurePort,
        arrivalPort,
      };

      // popup位置計算
      const eventElement = info.el.getBoundingClientRect();

      showPopup.value = true;
      await nextTick();
      const popupWidth = popupRef.value.offsetWidth
      showPopup.value = false;
      const windowWidth = window.innerWidth;

      let left = eventElement.right + 10;
      if (left + popupWidth > windowWidth) {
        left = eventElement.left - popupWidth - 10;
      }
      let top = eventElement.top + window.scrollY;
      top = (top < calendarBodyTop.value) ? calendarBodyTop.value : top;

      popupStyle.value = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      };

      showPopup.value = true;
    };

    const handleEventMouseLeave = () => {
      showPopup.value = false;
    };

    const calendarOptions = ref({
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: currentView.value,
      locales: [jaLocale],
      locale: 'ja',
      customButtons: {
        calendarcontrol: {
          text: 'カレンダー',
          click: function() {
            const calendarApi = fullCalendarRef.value.getApi();
            if (currentView.value === 'timeGridWeek') {
              currentView.value = 'dayGridMonth';
              calendarApi.changeView('dayGridMonth');
            } else {
              currentView.value = 'timeGridWeek';
              calendarApi.changeView('timeGridWeek');
           }
          }
        }
      },
      headerToolbar: {
        start: 'calendarcontrol today prev next title',
        center: '',
        end: '',
      },
      events: events.value,
      allDaySlot: false,
      slotLabelFormat: {
        hour: 'numeric',
        minute: '2-digit',
        omitZeroMinute: false,
        meridiem: false,
        hour12: false
      },
      eventMouseEnter: handleEventMouseEnter,
      eventMouseLeave: handleEventMouseLeave,
      datesSet: (info) => {
        setCustomTitle(info);
        highlightTodayHeader(props.newEvent.departureDate);
      },
      dayHeaderContent: (arg) => {
        if (currentView.value === 'timeGridWeek') {
          const date = new Date(arg.date);
          const day = date.getDate().toString().padStart(2, '0');
          const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
          return {
            html: `<span>${day}</span><span>${weekday}</span>`
          };
        }else {
          const date = new Date(arg.date);
          const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
          return {
            html: `<span>${weekday}</span>`
          };
        }
      },

      eventContent: function(arg) {
        let timeText = arg.timeText.replace('時', ':00');
        const flightPurpose = arg.event.extendedProps?.flightPurpose;
        const purposeHtml = flightPurpose
          ? `<div class="fc-event-purpose">${flightPurpose}</div>`
          : '';
        return { html: `<div class="fc-event-time">${timeText}</div><div class="fc-event-title">${arg.event.title}</div>${purposeHtml}` };
      },
      eventDidMount: function(info) {
        // ブロックイベントにクラスを変更
        if (!info.event.allDay && !info.event.end) {
          info.el.classList.remove('fc-daygrid-dot-event');
          info.el.classList.add('fc-daygrid-block-event');
        }
        // イベントの色を設定
        info.el.style.backgroundColor = info.event.extendedProps.color || info.event.backgroundColor;
        info.el.style.color = info.event.extendedProps.textColor || info.event.textColor;
      },

      dayCellDidMount: function(arg) {
        // 過去日付の背景色を変更
        if(arg.date < new Date().setHours(0, 0, 0, 0)) {
          arg.el.style.backgroundColor = '#EFF2F6';
        }
      },
      dayHeaderDidMount: function(arg) {
        // 過去日付の曜日ヘッダ部を変更（週表示の場合のみ）
        if(currentView.value === 'timeGridWeek' && arg.date < new Date().setHours(0, 0, 0, 0)) {
          arg.el.style.backgroundColor = '#EFF2F6';
        }
        // ヘッダ下端Y座標を日付部上端Y座標として取得
        calendarBodyTop.value = arg.el?.getBoundingClientRect()?.bottom ?? 0;
      }
    });

    const updatePopupPosition = () => {
      if (showPopup.value && popupElement.value) {
        const eventElement = document.querySelector('.fc-event-clicked').getBoundingClientRect();

        const popupWidth = 200; // ポップアップの幅を設定
        const windowWidth = window.innerWidth;

        let left = eventElement.right + 10; // デフォルトはイベントの右側に表示
        if (left + popupWidth > windowWidth) {
          left = eventElement.left - popupWidth - 10; // 右端に切れそうな場合は左側に表示
        }

        popupStyle.value = {
          position: 'fixed',
          top: `${eventElement.top + window.scrollY}px`,
          left: `${left}px`
        };
      }
    };

    onMounted(() => {
      window.addEventListener('scroll', updatePopupPosition);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('scroll', updatePopupPosition);
    });

    const setCustomTitle = (info) => {
      const titleElement = document.querySelector('.fc-toolbar-title');
      if (currentView.value === 'timeGridWeek') {
        const start = new Date(info.start);
        const end = new Date(info.end);
        end.setDate(end.getDate() - 1); // 1日減らす
        const startDate = start.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
        const endDate = end.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
        if (titleElement) {
          titleElement.textContent = ''; // ここでデフォルトのタイトルをクリア
          // 少し待機してからカスタムタイトルを設定
          setTimeout(() => {
            titleElement.textContent = `${startDate} ～ ${endDate}`;
          }, 100);
        }
      }else {
        const titleMonth = info.view.title;    
        if (titleElement) {
          titleElement.textContent = ''; // ここでデフォルトのタイトルをクリア
          setTimeout(() => {
            titleElement.textContent = titleMonth; // ここでデフォルトのタイトルを設定
          }, 100);
        }
      }
    };
    // 初期表示時にカスタムタイトルを設定
    onMounted(() => {
      const calendarApi = fullCalendarRef.value.getApi();
      const currentView = calendarApi.view;
      setTimeout(() => {
        setCustomTitle({ start: currentView.activeStart, end: currentView.activeEnd, view: currentView });
      }, 300);
    });

    function highlightTodayHeader(departureDate) {
      const today = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      const headerCells = document.querySelectorAll('.fc-col-header-cell');

      // すべてのspanElementのスタイルを元に戻す
      headerCells.forEach(cell => {
        const spanElement = cell.querySelector('span');
        if (spanElement) {
          spanElement.style.color = ''; 
          spanElement.style.backgroundColor = ''; 
          spanElement.style.borderRadius = ''; 
          spanElement.style.padding = ''; 
          spanElement.style.display = ''; 
          spanElement.style.width = ''; 
          spanElement.style.height = ''; 
          spanElement.style.textAlign = ''; 
        }
      });

      /* ★当日 および 予約日に ● をつけないよう該当処理コメント化
      headerCells.forEach(cell => {
        const cellDate = cell.getAttribute('data-date');
        if (cellDate === today || cellDate === departureDate) {
          const spanElement = cell.querySelector('span');
          if (spanElement) {
            spanElement.style.color = '#ffffff'; 
            spanElement.style.backgroundColor = '#000000'; 
            spanElement.style.borderRadius = '50%'; 
            spanElement.style.padding = '5px'; 
            spanElement.style.display = 'inline-block'; 
            spanElement.style.width = '35px'; 
            spanElement.style.height = '35px'; 
            spanElement.style.textAlign = 'center'; 
          }
        }
      });*/
    }

  const checkOverlap = (newEvent) => {
    console.log('checkOverlap called with newEvent:', newEvent);
    const newStart = new Date(`${newEvent.departureDate}T${newEvent.departureTime}`).getTime();
    const newEnd = new Date(`${newEvent.arrivalDate}T${newEvent.arrivalTime}`).getTime();

    // newStartがnewEndの前であるかのチェック
    if (newStart >= newEnd) {
        return 2; // NG
    }

    // reserveList(航路予約)をチェック
    for (const reserve of reserveList) {
        const reserveStart = new Date(reserve['airwaySections'][0]['startAt']).getTime();
        const reserveEnd = new Date(reserve['airwaySections'][reserve['airwaySections'].length-1]['endAt']).getTime();

        if ((newStart >= reserveStart && newStart < reserveEnd) || 
            (newEnd > reserveStart && newEnd <= reserveEnd) || 
            (newStart <= reserveStart && newEnd >= reserveEnd)) {
            return 3; // 重複あり
        }
    }

    // ★ 他社予約（availabilityData）もチェック
    for (const a of (props.availabilityData ?? [])) {
      for (const sec of (a?.uaslSections ?? [])) {
        const otherStart = new Date(sec.startAt).getTime();
        const otherEnd   = new Date(sec.endAt).getTime();

        if ((newStart >= otherStart && newStart < otherEnd) ||
            (newEnd > otherStart && newEnd <= otherEnd) ||
            (newStart <= otherStart && newEnd >= otherEnd)) {
          return 3; // 重複あり
        }
      }
    }
   
    return 1; // 重複なし
  };
  

    const addNewEvent = () => {
      if (props.newEvent.departureDate && props.newEvent.departureTime && props.newEvent.arrivalDate && props.newEvent.arrivalTime) {
        let flag = checkOverlap(props.newEvent);
        if (flag === 1) {
          emit('update-flag', flag);

          //新規予約分
          const event = {
            title: '',
            start: `${props.newEvent.departureDate}T${props.newEvent.departureTime}`,
            end: `${props.newEvent.arrivalDate}T${props.newEvent.arrivalTime}`,
            color: '#2C69FFE6',
            textColor: '#FFFFFF',
            classNames: 'airway-port-reserve',
          };
          // 既存のイベントを残しつつ、新しいイベントを更新
          const existingEventIndex = events.value.findIndex(e => e.title === '');
          if (existingEventIndex !== -1) {
            events.value[existingEventIndex] = event;
          } else {
            events.value.push(event);
          }
          const calendarApi = fullCalendarRef.value.getApi();
          const currentView = calendarApi.view;
          setCustomTitle({ start: currentView.activeStart, end: currentView.activeEnd, view: currentView });
          // departureDateに飛ぶ処理を追加
          calendarApi.gotoDate(props.newEvent.departureDate);
        } else {
          const existingEventIndex = events.value.findIndex(e => e.title === '');
          if (existingEventIndex !== -1) {
            events.value.splice(existingEventIndex, 1);
          }
          const calendarApi = fullCalendarRef.value.getApi();
          const currentView = calendarApi.view;
          setCustomTitle({ start: currentView.activeStart, end: currentView.activeEnd, view: currentView });
          emit('update-flag', flag);       
        }
      }
    };

    expose({ addNewEvent });

    onMounted(async () => {
      await loadEvent(props.start, props.end);
      highlightTodayHeader(props.newEvent.departureDate);
    });


    return {
      calendarOptions,
      dialogVisible,
      newEvent,
      events,
      fullCalendarRef,
      popupRef,
      showPopup,
      popupEvent,
      popupStyle,
      popupElement
    };
  },
};
</script>

<style>
.popup {
  background: #707070;
  color: #ffffff;
  padding: 10px;
  width: max-content;
  max-width: 200px;
  min-width: 150px;
  height: max-content;
  min-height: 120px;
  border-radius: 6px;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}
.dialog-content {
  display: flex;
  flex-direction: column;
}
.dialog-content input {
  margin-bottom: 10px;
}
.dialog-content button {
  margin-right: 10px;
}

.calendar-control {
  position: fixed;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.fc-col-header-cell-cushion {
  color:black;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.fc-col-header-cell-cushion span {
  display: block;
  line-height: 1.2;
}

.fc-toolbar-title {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-16)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic)!important;
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  margin-left: 2rem!important;
}

.fc-toolbar-chunk {
  display: flex;
  align-items: center;
}

.fc-prev-button, .fc-next-button {
  background-color: white!important;
  border-color: #FFFFFF00!important;
  color: black!important;
  padding: 0.1em 0.6em!important;
  border-radius: 0rem!important;
}

.fc-calendarcontrol-button {
  padding: 0.1em 2.0em!important;
  background-color: white!important;
  border-color: #FFFFFF00!important;
  color: black!important;
  border-radius: 0rem!important;
}

.fc-today-button {
  padding: 0.1em 3.0em!important;
  background-color: white!important;
  border-color: #FFFFFF00!important;
  color: black!important;
  opacity: 1.0!important;
  border-radius: 0rem!important;
}


.fc .fc-button .fc-icon {
  font-size: 1.0em; 
  vertical-align: baseline; 
}

.fc-icon-chevron-left::before {
  content: "◀";
}

.fc-icon-chevron-right::before {
  content: "▶";
}

.fc-theme-standard .fc-scrollgrid {
  border: 1px solid #E1E5EB; 
}

.fc-theme-standard td, .fc-theme-standard th {
  border: none; 
}

.fc-col-header  {
  height: 60px!important;
}

.fc-col-header-cell-cushion span {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/24px var(--unnamed-font-family-biz-udpgothic)!important;
  font-size: 0.75rem !important;
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: center;
  height: 35px;
  width: 35px;
  padding: 5px; 
}

.fc .fc-timegrid-col {
  border: 1px solid #E1E5EB!important;
}

/*横ヘッダーの1時間の線を消す*/
.fc .fc-timegrid-slot.fc-timegrid-slot-label.fc-scrollgrid-shrink {
  border: none!important;
}

/*横ヘッダーの30分の線を消す*/
.fc-timegrid-slot-minor {
  border: none!important;
}

/*30分の線を破線にする*/
.fc .fc-timegrid-slot {
  border-bottom: 1px dashed #E1E5EB;
}

/*1時間の線を実線にする*/
.fc .fc-timegrid-slot {
  border-top: 1px solid #E1E5EB;
}

.fc .fc-daygrid-day, .fc .fc-timegrid-axis, .fc .fc-timegrid-col {
 border:1px solid #E1E5EB;
}

.fc .fc-col-header-cell {
  border: 1px solid #E1E5EB;
}

.fc-timeGridWeek-view.fc-view.fc-timegrid {
  border: none;
  border-right: 1px solid #E1E5EB;
}

.fc .fc-day-today {
  background-color: transparent !important;
}

.fc-view-harness.fc-view-harness-active {
  min-height: 400px;
  height: calc(100vh - 240px)!important;
}

.fc-scroller::-webkit-scrollbar {
  width: 5px;
  background: white;
}

.fc-scroller::-webkit-scrollbar-thumb {
  background-color: #999999;
  border-radius: 20px;
  width: 5px;
}

.fc .fc-daygrid-day-number {
  color: #999999!important;
  text-decoration: none;
  font-size: 0.75rem;
  line-height: 1;
}

.fc-dayGridMonth-view.fc-view.fc-daygrid {
  border: 1px solid #999999;
}

.fc .fc-timegrid-slot-label-cushion {
  font-family: BIZ UDPGothic;
  font-weight: 400;
  font-style: Regular;
  font-size: 10px;
  line-height: 10px;
  letter-spacing: 0%;
  text-align: right;
  padding-top: 13px;
}

.fc-timegrid-event {
  border-radius: 0px;
}

.fc-event-time, .fc-event-title, .fc-event-purpose {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-12)/16px var(--unnamed-font-family-biz-udpgothic)!important;
  letter-spacing: var(--unnamed-character-spacing-0);
}

.fc .fc-timegrid-slot {
  height: 30px;
}

.fc-direction-ltr .fc-timegrid-slot-label-frame  {
  margin-top: -25px;
}

.fc-calendarcontrol-button {
  margin-left: 3rem!important;
}

.fc-next-button {
  margin-left: 2rem!important;
}

.fc .fc-timegrid-slot-label {
  width:60px;
}

th.fc-col-header-cell:not(:first-child) {
  position: relative;

  &:before {
    display: none;
  }
}

.airway-port-all, .other-reservation, .airway-port-reserve, .aiway-all, .port-all, .airway-port-departure, .airway-port-arrival {
  position: relative; /* 擬似要素の位置を相対的に設定 */
  padding-left: 18px!important; /* 左側の余白を調整 */
  border-radius: 6px;
}


.airway-port-all::before, .airway-port-all::after,
.other-reservation::before, .other-reservation::after,
.airway-port-reserve::before, .airway-port-reserve::after,
.aiway-all::before, .port-all::before,
.airway-port-departure::before, .airway-port-arrival::before
{
  content: '';
  position: absolute;
  top: 3px; 
  bottom: 3px; 
  width: 4px;
  border-radius: 4px;
}

.airway-port-all::before, .aiway-all::before, .port-all::before,.airway-port-departure::before, .airway-port-arrival::before {
  top: 16px;
  bottom: 16px;
  left: 3px; /* 1本目の線の位置 */
  background-color: #2C69FF;
}

.airway-port-all::after {
  left: 3px; /* 2本目の線の位置 */
  background: linear-gradient(
    to bottom,
    #2C69FF 0%,
    #2C69FF 8px,
    transparent 8px,
    transparent calc(100% - 8px),
    #2C69FF calc(100% - 8px),
    #2C69FF 100%
  ); 
}

.other-reservation::before {
  top: 16px;
  bottom: 16px;
  left: 3px; /* 1本目の線の位置 */
  background-color: #0E8C85;
}

.other-reservation::after {
  left: 3px; /* 2本目の線の位置 */
  background: linear-gradient(
    to bottom,
    #0E8C85 0%,
    #0E8C85 8px,
    transparent 8px,
    transparent calc(100% - 8px),
    #0E8C85 calc(100% - 8px),
    #0E8C85 100%
  ); 
}

.airway-port-reserve::before {
  top: 16px;
  bottom: 16px;
  left: 3px; 
  background-color: #ffffff; 
}

.airway-port-reserve::after {
  left: 3px;
  background: linear-gradient(
    to bottom,
    #ffffff 0%,
    #ffffff 8px,
    transparent 8px,
    transparent calc(100% - 8px),
    #ffffff calc(100% - 8px),
    #ffffff 100%
  ); 
}

.airway-port-departure::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 8px; /* 2本目の線の位置 */
  height: 13px;
  width: 3px;
  background: #707070; 
}

.airway-port-arrival::after {
  content: '';
  position: absolute;
  bottom: 3px;
  left: 8px; /* 2本目の線の位置 */
  height: 13px;
  width: 3px;
  background: #707070; 
}
</style>

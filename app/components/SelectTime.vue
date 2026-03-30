<template>
  <!-- 区間・日時指定 -->
  <div class="b-dateTimeScheduleForm">
   <div class="c-formItem-selectTime">
      <label for="sectionField" class="e-fieldLabel-section">航路</label>
      <div class="sectionField">{{ this.airwayName.join(", ") }}</div>  
    </div>
    <div class="c-formItem-selectTime">
      <label for="depatureSectionField" class="e-fieldLabel-section">離陸</label>
      <div class="sectionField">{{ this.start }}</div>  
    </div>
    <div class="c-formItem-selectTime">
      <label for="depatureSectionField" class="e-fieldLabel-section">離陸場</label>
      <div class="portField">{{ this.departurePort }}</div>  
    </div>
    <div class="c-formItem-selectTime">
      <label for="arrivalSectionField" class="e-fieldLabel-section">着陸</label>
      <div class="sectionField">{{ this.end }}</div> 
    </div>
    <div class="c-formItem-selectTime">
      <label for="depatureSectionField" class="e-fieldLabel-section">着陸場</label>
      <div class="portField">{{ this.arrivalPort }}</div>  
    </div>
    <dl class="select-time">
      <div class="c-formItem">
        <dt class="e-fieldLabel-time">離陸日時</dt>
        <dd>
          <ul class="e-buttonGroup">
           <li>
              <input type="date" class="e-textField-date" v-model="departureDate" @change="emitDates"/>
            </li>
           <li>
              <input type="time" class="e-textField-time" v-model="departureTime" @change="emitDates"/>
	         </li>
          </ul> 
	      </dd>
      </div>
      <div class="c-formItem">
        <dt class="e-fieldLabel-time">着陸日時</dt>
        <dd>
         <ul class="e-buttonGroup">
            <li>
              <input type="date" class="e-textField-date" v-model="arrivalDate" @change="emitDates"/>
            </li>
            <li>
              <input type="time" class="e-textField-time" v-model="arrivalTime" @change="emitDates"/>
            </li>
	        </ul>
        </dd>
      </div>
      <div class="c-formItem-selectTime">
        <label for="depatureSectionField" class="e-fieldLabel-aircraftId">DIPS登録記号</label>
        <div class="sectionField">{{ this.aircraftRemoteId }}</div>
      </div> 
      <div class="c-formItem-searchVacancies">
        <dt class="e-fieldLabel-time">この日程条件の</dt>
        <dd>
          <button class="select-time-button" @click="handleButtonClick">航路空き状況</button>
	      </dd>
      </div>
      <div :style="{ visibility: showText ? 'visible' : 'hidden' }" class="search-result">
        <div>{{ showTextMessage }}</div>

        <!-- 予約可能のときだけ、同じ白枠内に料金を表示 -->
        <div v-if="flag === 1" style="margin-top: 6px;">
          <span v-if="priceLoading">料金 取得中...</span>
          <span v-else-if="price !== null">料金 {{ formatYen(price) }}円</span>
          <span v-else-if="priceError">{{ priceError }}</span>
        </div>
      </div>
    </dl>
  </div>
</template>

<script>
export default {
  name: 'SelectTime',
  props: {
    airwayName: {
      type: String,
      required: true
    },
  aircraftId: {
    type: String,
    required: false,
    default: '' 
  },
  aircraftRemoteId: {
    type: String,
    required: false,
    default: ''
  },
  aircraftInfo: {
    type: Object,
    required: false,
    default: ''
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
  flag: {
    type: Number,
    default: 0
  },
  airwayData: {
    type: Object,
    default: true
  },
  airwayId: {
    type: String,
    default: true
  },
  section: {
    type: String,
    default: true
  },
  sectionIdList: {
    type: Array,
    default: () => []
  },
  departurePortId: {
    type: String,
    default: true
  },
  arrivalPortId: {
    type: String,
    default: true
  }
  },
  data() {
    return {
      departureDate: '',
      departureTime: '',
      arrivalDate: '',
      arrivalTime: '',
      showText: false,
      showTextMessage: '日時を入力してください',
      postJsonData: "",
      price: null,
      priceLoading: false,
      priceError: '',
    };
  },
  methods: {
    emitDates() {
      this.$emit('update-dates', {
        departureDate: this.departureDate,
        departureTime: this.departureTime,
        arrivalDate: this.arrivalDate,
        arrivalTime: this.arrivalTime,
      });
    },
    
    async handleButtonClick() {
      this.$emit('add-new-event', {
        departureDate: this.departureDate,
        departureTime: this.departureTime,
        arrivalDate: this.arrivalDate,
        arrivalTime: this.arrivalTime,
      });
      this.showText = true;
      this.updateShowTextMessage(this.flag);
      // 料金取得
      this.price = null;
      this.priceError = '';
      this.priceLoading = true;

      try {
        const amount = await this.fetchPrice();
        this.price = (amount ?? null);
      } catch (e) {
        console.error(e);
        this.priceError = '料金の取得に失敗しました';
      } finally {
        this.priceLoading = false;
      }
    },
    updateShowTextMessage(flag) {
      console.log(flag);
      if (flag === 1) {
        this.showTextMessage = 'この日程で航路予約可能です';
      } else if (flag === 2) {
        this.showTextMessage = '指定した日時が不正です';     
      } else {
        this.showTextMessage = 'この日程は予約が重複しています';
      }
    },

    async fetchPrice() {
      this.postJsonData = await this.generateJson();
      let estimateRes = await $fetch('/api/reservation/uaslReservations/estimate', { 
        method: 'POST',
        body: this.postJsonData
      });
      console.log(estimateRes);
      if (estimateRes.status !== 200) {
        console.error(`error: get airway reservation info {status: ${estimateRes.status}}.`);
        this.reservationData = {};
        return;
      }
      return estimateRes.data.totalAmount
    },

    async generateJson() {
      let airwaySections = []
      const sectionIdList = this.sectionRange();

      const startAt = this.startAt();
      const endAt = this.endAt();

      for (let i = 0; i < sectionIdList.length; i += 1) {
        let foundAirwayId = null;
        for (const airway of this.airwayData.airway.airways) {
          for (const airwaySection of airway.airwaySections) {
            if (sectionIdList[i] === airwaySection.airwaySectionId) {
              foundAirwayId = airway.airwayId;
              break;
            }
          }
          if (foundAirwayId) break;
        }
        if (!foundAirwayId) continue;
        
        airwaySections.push({
          uaslSectionId: sectionIdList[i],
          uaslId: foundAirwayId,
          startAt: this.startAt(),
          endAt: this.endAt()
        })
      }

      const payload = {
        uaslSections: airwaySections,
      };

      if (this.aircraftId) {
        payload.vehicles = [
          {
            vehicleId: this.aircraftId,
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

    sectionRange() {
      if (Array.isArray(this.sectionIdList) && this.sectionIdList.length) return this.sectionIdList;
      return [];
    },

    startAt() {
      // 要修正。日本で使われるケースのみ想定。
      return useDateStringLocaltoUTC(this.departureDate + 'T' + this.departureTime + ':00+09:00');
    },
    // 終了日時をISOの形で返す
    endAt() {
      // 要修正。日本で使われるケースのみ想定。
      return useDateStringLocaltoUTC(this.arrivalDate + 'T' + this.arrivalTime + ':00+09:00');
    },

    formatYen(amount) {
      if (amount === null || amount === undefined || amount === '') return '';
      return new Intl.NumberFormat('ja-JP').format(Number(amount));
    },
  },
  watch: {
    flag(newVal) {
      this.updateShowTextMessage(newVal);
    }
  },

  async mounted() {
  }
};
</script>

<style scoped>
.b-pageContentHasSubMenu {
    padding-left: 0!important;
}

.b-dateTimeScheduleForm {
  background-color: #f5f5f5;
  padding: 10px;
  padding-top: 50px;
  margin-top: 50px;
}

h2.e-pageTitle{
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-16)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
}

.dropdown-title {
  margin-top: 0.5rem;
}

.dropdown-container {
  border: 1px solid #000;
  padding: 5px;
  padding-right: 110px;
  display: inline-block;
  margin-top: 0.5rem;
}

.dropdown-container-datetime {
  border: 1px solid #000;
  padding: 5px;
  display: inline-block;
  margin-top: 0.5rem;
}

.custom-select {
  -webkit-appearance: none;
  appearance: none;
}

.custom-arrow {
  position: relative;
}

.custom-arrow::after {
  content: "";
  position: absolute;
  top: 12px;
  right: 12px;
  border-right: 6px solid transparent;
  border-left: 6px solid transparent;
  border-top: 12px solid black;
  border-bottom: 0;
}

.dropdown-container-datetime.custom-arrow{
  padding-right: 30px;
}

.styled-input {
  border: none;
  font-size: 16px;
  padding: 5px;
  width: 100%;
}

.icon-del-time {
  position: relative;
}

.icon-del-time::-webkit-calendar-picker-indicator {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
}
   
.c-formItem-selectTime {
  display: flex;
}

.e-fieldLabel-section {
  width: 50px;
  margin-right: 10px;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-12)/var(--unnamed-line-spacing-28) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

.e-fieldLabel-aircraftId {
  width: 100px;
  margin-right: 10px;
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-12)/var(--unnamed-line-spacing-28) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

.e-fieldLabel-time {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-12)/var(--unnamed-line-spacing-28) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
}

.sectionField {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
  padding-top: 5px;
}

.portField {
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-12)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
  padding-top: 5px;
}

.e-textField-date {
  width: 139px;
  height: 35px;
  border: 1px solid var(--line_-999999);
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
  background-color: white;
}

.e-textField-time {
  width: 86px;
  height: 35px;
  border: 1px solid var(--line_-999999);
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: left;
  background-color: white;
}

.select-time {
  margin-top: 20px;
}

.select-time-button {
  height: 35px;
  width: 118px;
  border: 1px solid var(--line_-999999);
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-normal) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: center;
  background-color: white;
}

.c-formItem-searchVacancies{
  display: flex;
  justify-content: flex-end;
}

.search-result {
  width: 250px;
  min-height: 50px;
  border: 1px solid var(--line_-999999);
  font: var(--unnamed-font-style-normal) normal var(--unnamed-font-weight-bold) var(--unnamed-font-size-14)/var(--unnamed-line-spacing-14) var(--unnamed-font-family-biz-udpgothic);
  letter-spacing: var(--unnamed-character-spacing-0);
  color: var(--txt_-333333);
  text-align: center;
  padding: 18px;
  margin-top: 10px;
  margin-bottom: 10px;
  background-color: white;
}
</style>

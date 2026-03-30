<template>
  <!-- 詳細情報 -->
  <v-card-text class="drn_content">
    <div class="drn_content__body">

      <v-sheet class="drn_content__data">
        <div class="drn_form">

          <div class="drn_form__header">
            <div class="drn_form__title">
              基本情報選択
            </div>
            <!-- /.drn_form__title -->
          </div>
          <!-- /.drn_form__header -->

          <div class="drn_form__body">

            <label class="drn_form__label">航路名</label>
            <v-text-field
              type="input"
              density="compact"
              variant="outlined"
              placeholder="航路名を入力"
              class="drn_form__input"
              v-model="routeName"
              id="routeNameField"
              maxlength="200"
              @change="updateBasicInfomation"
            ></v-text-field>

            <label class="drn_form__label">飛行目的</label>
            <v-select
              density="compact"
              variant="outlined"
              placeholder="------------------"
              :items="purposeItems"
              menu-icon="fa fa-sharp fa-regular fa-angle-down"
              class="drn_form__select"
              v-model="selectedPurpose"
              @update:modelValue="updateBasicInfomation"
            ></v-select>

            <label class="drn_form__label">エリア</label>
            <v-select
              density="compact"
              variant="outlined"
              placeholder="------------------"
              :items="areaNameItems"
              menu-icon="fa fa-sharp fa-regular fa-angle-down"
              class="drn_form__select"
              v-model="areaName"
              @update:modelValue="updateBasicInfomation(); resetFallToleranceRangeItems()"
            ></v-select>

            <label class="drn_form__label">最大落下範囲</label>
            <v-select
              density="compact"
              variant="outlined"
              placeholder="------------------"
              :items="viewFallToleranceRangeItems"
              menu-icon="fa fa-sharp fa-regular fa-angle-down"
              class="drn_form__select"
              v-model="fallToleranceRange"
              :disabled="!areaName"
              @update:modelValue="updateBasicInfomation"
            ></v-select>

            <!-- ドローン機体登録 -->
            <div class="drn_form__label" style="margin-bottom: 8px;">
              ドローン機体登録
            </div>

            <!-- チップ + 追加ボタン -->
            <div class="mt-2 chips-inline">
              <v-chip
                v-for="a in registeredAircrafts"
                :key="a.uiId"
                class="ma-1"
                closable
                @click:close.stop.prevent="removeAircraftById(a.uiId)"
              >
                {{ a.modelNumber }}
              </v-chip>

              <v-btn
                class="ma-1 add-chip-btn add-chip-btn--white-outline"
                variant="outlined"
                icon
                rounded="circle"
                size="25"
                @click="openAircraftModal"
                aria-label="機体を追加"
              >
                <v-icon size="20">mdi-plus</v-icon>
              </v-btn>
            </div>

            <!-- 機体追加モーダル：中央寄せ（v-dialog デフォルト） -->
            <v-dialog
              v-model="showAircraftModal"
              max-width="600"
              scrollable>
              <v-card>
                <v-card-title>機体の追加</v-card-title>
                <v-card-text>
                  <label class="drn_form__label">機体種別</label>
                  <v-select
                    density="compact"
                    variant="outlined"
                    placeholder="------------------"
                    :items="uniqueTypeItems"
                    menu-icon="fa fa-sharp fa-regular fa-angle-down"
                    class="drn_form__select"
                    v-model="newAircraft.selectedType"
                    @update:modelValue="onNewTypeChange"
                  />

                  <label class="drn_form__label">サイズ(アーム展開時)</label>
                  <v-select
                    density="compact"
                    variant="outlined"
                    placeholder="------------------"
                    :items="lengthOptionItems"
                    menu-icon="fa fa-sharp fa-regular fa-angle-down"
                    class="drn_form__select"
                    v-model="newAircraft.selectedLength"
                    @update:modelValue="onNewLengthChange"
                  />

                  <label class="drn_form__label">モデル</label>
                  <v-select
                    density="compact"
                    variant="outlined"
                    placeholder="------------------"
                    :items="newAircraft.filteredModelItems"
                    item-title="title"
                    item-value="value"
                    :return-object="true"
                    menu-icon="fa fa-sharp fa-regular fa-angle-down"
                    class="drn_form__select"
                    v-model="newAircraft.selectedModel"
                  />
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn variant="text" @click="closeAircraftModal">キャンセル</v-btn>
                  <v-btn
                    variant="flat"
                    color="primary"
                    :disabled="!canAddNewAircraft"
                    @click="addAircraft"
                  >追加</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </div>
          <!-- .drn_form__body -->
        </div>
        <!-- .drn_form -->
      </v-sheet>
      <!-- .drn_content__data -->

    <!-- .basicInfomationSelect -->

    <v-sheet class="drn_content__map">
      <MapComponent
        v-if="rangeData && areaData && droneData"
        :stepNo="stepNo"
        :area="areaName"
        :areaInfo="areaNames"
        :rangeId="fallToleranceRangeId"
        :rangeInfo="fallToleranceRanges"
        ref="childRef"
      />
    </v-sheet>
    <!-- .drn_content__map -->

    </div>
    <!-- .drn_content__body -->
  <!-- .b-twoColumn -->
  </v-card-text>
  <!-- .drn_content -->
</template>

<script>
import MapComponent from "~/components/map/showFallToleranceRangeGrayScale.vue";

export default {
  components: {
    MapComponent
  },
  props: {
    stepNo: {
      type: String,
      required: true,
    },
  },
  data() {
    return {

      // 航路名
      routeName: null,

      // 飛行目的
      selectedPurpose: null,
      purposeItems: [
        {title: '物資運搬',   value: '物資運搬'},
        {title: '送電線点検', value: '送電線点検'},
        {title: '河川監視',   value: '河川監視'},
        {title: '山岳監視',   value: '山岳監視'},
        {title: 'その他',     value: 'その他'},
      ],

      // エリア
      areaNames: [], // input from JSON
      areaName: null,
      areaNameItems: [], // v-select 選択肢用

      // 最大落下範囲
      fallToleranceRanges: [], // input from API(/api/airway/max-fall-range)
      fallToleranceRange: '------------------',
      fallToleranceRangeItems: [], // v-select 選択肢用

      // 機体種別
      uniqueTypes: [], // input from API(/api/airway/aircraft)
      selectedType: '------------------',
      uniqueTypeItems: [], // v-select 選択肢用

      // サイズ(アーム展開時)
      selectedLength: '------------------',
      lengthOptionItems: [
        {title: '500mm未満',        value: '500mm未満'},
        {title: '500mm以上950mm未満', value: '500mm以上950mm未満'},
        {title: '950mm以上',        value: '950mm以上'},
      ], // v-select 選択肢用

      // モデル
      filteredModels: [], // input from API(/api/airway/aircraft)
      selectedModel: '------------------',
      filteredModelItems: [], // v-select 選択肢用

      // MapComponent
      rangeData: null,
      areaData: null,
      droneData: null,
      fallToleranceRangeId: null,
      droneItems: [],

      basicInfomation: {
        purpose: '',
        routeName: '',
        fallToleranceRange: '',
        fallToleranceRangeId: '',
      },

      cookie_role: null,
      role: null,
      stepNo: this.stepNo,

      // 機体追加モーダル管理
      showAircraftModal: false,
      newAircraft: {
        selectedType: '------------------',
        selectedLength: '------------------',
        selectedModel: '------------------',
        filteredModelItems: [],
      },
      registeredAircrafts: [],
      aircraftIdSeq: 0,
    };
  },
  computed: {
    // 追加ボタン活性/非活性
    canAddNewAircraft() {
      const n = this.newAircraft;
      const hasModel = !!n.selectedModel?.raw;
      return (
        n.selectedType !== '------------------' &&
        n.selectedLength !== '------------------' &&
        hasModel
      );
    },
    viewFallToleranceRangeItems() {
      if (this.areaName) {
        const list = this.fallToleranceRanges.fallToleranceRanges.filter(item => item.areaName === this.areaName)
        this.fallToleranceRangeItems = [];
        list.forEach(element => {
          this.fallToleranceRangeItems.push({
            title: element.name,
            value: element.name
          });
        });
        return this.fallToleranceRangeItems;
      } else {
        console.log("No Data")
        return [];
      }
    }
  },
  watch: {
    fallToleranceRange(newVal) {
      const selectedItem = this.fallToleranceRanges.fallToleranceRanges.find(item => item.name === newVal);
      this.fallToleranceRangeId = selectedItem ? selectedItem.fallToleranceRangeId : null;
      this.updateBasicInfomation()
    }
  },
  methods: {
    getUniqueTypes() {
      const types = this.droneItems.aircraft.map(item => item.type);
      this.uniqueTypes = [...new Set(types)];
      this.uniqueTypeItems = this.uniqueTypes.map(v => ({ title: v, value: v }));
      this.updateBasicInfomation()
    },
    resetFallToleranceRangeItems() {
      this.fallToleranceRange = []
      this.$refs.childRef.resetSelectedFallToleranceRange();
    },
    async rolecheck() {
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
    },
    // 基本情報集約（registeredAircrafts ベース）
    updateBasicInfomation() {
      const first = this.registeredAircrafts[0] || null;

      const findByKeyOrName = (a) => {
        if (a.selectedModelKey) {
          return this.droneItems?.aircraft?.find(item => this.getAircraftKey(item) === a.selectedModelKey);
        }
        return this.droneItems?.aircraft?.find(item =>
          item.name === a.name && item.type === a.type && item.length === a.length
        );
      };

      const drones = (this.registeredAircrafts || [])
        .map(a => findByKeyOrName(a))
        .filter(Boolean);

      const firstDrone = first ? findByKeyOrName(first) : null;

      this.basicInfomation.purpose = this.selectedPurpose;
      this.basicInfomation.routeName = this.routeName;
      this.basicInfomation.fallToleranceRange = this.fallToleranceRange;
      this.basicInfomation.fallToleranceRangeId = this.fallToleranceRangeId;

      this.basicInfomation.aircrafts = drones.map(d => JSON.stringify(d));
      this.basicInfomation.selectedModels = this.registeredAircrafts.map(a => a.modelNumber);

      this.$emit('update:basicInfomation', this.basicInfomation);
    },
    // モーダル操作（中央寄せなので位置計測不要）
    openAircraftModal() {
      this.newAircraft = {
        selectedType: '------------------',
        selectedLength: '------------------',
        selectedModel: null,
        filteredModelItems: [],
      };
      this.showAircraftModal = true;
    },
    closeAircraftModal() {
      this.showAircraftModal = false;
    },
    // モーダル内選択変更
    onNewTypeChange() {
      this.newAircraft.selectedLength = '------------------';
      this.newAircraft.selectedModel = '------------------';
      this.buildNewAircraftModelItems();
    },
    onNewLengthChange() {
      this.newAircraft.selectedModel = '------------------';
      this.buildNewAircraftModelItems();
    },
    // ユニークキー生成
    getAircraftKey(item) {
      const id = item?.aircraft_info_id ?? item?.id;
      const key = id ?? `${item?.name}|${item?.type}|${item?.length}`;
      return String(key);
    },
    // 重複判定：type・length・name で一致
    isSameByTLN(a, item) {
      return (a.type === item.type && a.length === item.length && a.name === item.name);
    },
    // モデル選択肢生成（モーダル）
    buildNewAircraftModelItems() {
      const tab = this.newAircraft;
      tab.filteredModelItems = [];

      if (!this.droneItems || !this.droneItems.aircraft) return;
      if (tab.selectedLength === '------------------') return;

      let minLength = 0;
      let maxLength = Infinity;
      if (tab.selectedLength === '500mm未満') {
        maxLength = 500;
      } else if (tab.selectedLength === '500mm以上950mm未満') {
        minLength = 500; maxLength = 950;
      } else if (tab.selectedLength === '950mm以上') {
        minLength = 950;
      }

      const candidateItems = this.droneItems.aircraft
        .filter(item =>
          item.type === tab.selectedType &&
          item.length >= minLength &&
          item.length < maxLength
        );

      const modelsWithoutDuplicates = candidateItems.filter(item => {
        return !this.registeredAircrafts.some(a => this.isSameByTLN(a, item));
      });

      tab.filteredModelItems = modelsWithoutDuplicates.map(item => ({
        title: item.modelNumber,
        value: this.getAircraftKey(item),
        raw: item,
      }));
    },
    // 追加
    addAircraft() {
      const n = this.newAircraft;
      if (!this.canAddNewAircraft) return;

      const sel = n.selectedModel;   // { title, value, raw }
      const master = sel?.raw;
      if (!master) {
        alert('選択したモデルの情報が見つかりません。');
        return;
      }

      const exists = this.registeredAircrafts.some(a => this.isSameByTLN(a, master));
      if (exists) {
        alert('同一の機体種別・モデル・長さの組み合わせが既に登録されています。');
        return;
      }

      const uiId = ++this.aircraftIdSeq;

      this.registeredAircrafts.push({
        uiId,
        selectedModelKey: sel.value,
        selectedLengthCategory: n.selectedLength,

        // APIフィールド
        maker: master.maker,
        modelNumber: master.modelNumber,
        name: master.name,
        type: master.type,
        ip: master.ip,
        length: master.length,
        weight: master.weight,
        maximumTakeoffWeight: master.maximumTakeoffWeight,
        maximumFlightTime: master.maximumFlightTime,
        deviation_range: master.deviation_range,
        fallingModel: master.fallingModel,
        aircraft_info_id: master.aircraft_info_id,
        id: master.id,
        airwayId: master.airwayId,
        airwayName: master.airwayName,
        area: master.area,
      });

      this.closeAircraftModal();
      this.updateBasicInfomation();
    },
    // 削除
    removeAircraft(index) {
      this.registeredAircrafts.splice(index, 1);
      this.updateBasicInfomation();
    },
    removeAircraftById(uiId) {
      const i = this.registeredAircrafts.findIndex(x => x.uiId === uiId);
      if (i !== -1) {
        this.registeredAircrafts.splice(i, 1);
        this.updateBasicInfomation();
      }
    },
  },
  async mounted() {
    $fetch('/api/getAreaJsonData')
    .then(response => {
      // JSONデータの取得が成功した場合、routesに代入
      const areaNames = response.data;
      this.areaNames = areaNames;
      this.areaData = response.data;

      this.areaNameItems = [];
      if (this.areaNames && this.areaNames.areas) {
        for (let i = 0; i < this.areaNames.areas.length; ++i) {
          const itemValue = this.areaNames.areas[i].name;
          this.areaNameItems.push({
            title: itemValue,
            value: itemValue
          });
        }
      }
      
    })
    .catch(error => {
      console.error('JSONの読み込みに失敗しました:', error);
    });

    // 最大落下範囲取得
    const rangeRes = await $fetch('/api/airway/max-fall-range', { 
      method: 'GET',
      query: { businessNumber: localStorage.getItem('uasl:user:parentOperatorId') }
    });
    console.log(rangeRes);
    if (rangeRes.status !== 200) {
      console.error(`error: get fall tolerance range info {status: ${rangeRes.status}}.`);
      this.rangeData = null;
      return;
    }
    const rangeData = convertMaxFallRangeToFallToleranceRanges(rangeRes.data);
    this.rangeData = rangeData;
    this.fallToleranceRanges = rangeData;
    this.fallToleranceRangeItems = [];

    const droneRes = await $fetch('/api/airway/aircraft', { 
      method: 'GET'
    });
    console.log(droneRes);
    if (droneRes.status !== 200) {
      console.error(`error: get drone info {status: ${droneRes.status}}.`);
      this.rangeData = null;
      return;
    }
    this.droneData = droneRes.data;
    this.droneItems = droneRes.data;
    this.getUniqueTypes();

    await this.rolecheck();
  },
};

</script>

<style>
/* ラベルと＋ボタンを横並び・折返し */
.chips-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.add-chip-btn--white-outline {
  background-color: #fff;
}
.add-chip-btn--white-outline.v-btn--variant-outlined {
  border: 1px solid #000;
}
.add-chip-btn--white-outline .v-icon {
  color: #000;
}
.add-chip-btn--white-outline:hover,
.add-chip-btn--white-outline:focus {
  background-color: #fff;
}
</style>

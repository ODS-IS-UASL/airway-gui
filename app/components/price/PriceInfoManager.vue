<script setup lang="ts">
import { computed } from 'vue'
import Draggable from 'vuedraggable'
import { nanoid } from 'nanoid'

const initialOption = { value: null, title: '' }
const { getCodeByType } = useCode()
const {
  $luxon,
} = useNuxtApp()
const { constants } = useMyConstant()

const formSetting = {
  // ラベル名・必須・最大長・セレクトリスト内容・チェックボックス内容設定用
  price: { label: '料金単価(円)', min: 0, max: 2147483647, required: true },
  priceType: { label: '料金タイプ', options: [initialOption, ...getCodeByType('priceType')], required: true },
  pricePerUnit: { label: '時間単位', min: 1, max: 2147483647, required: true },
  effectiveStartTime: { label: '適用開始日時', required: true },
  effectiveEndTime: { label: '適用終了日時', required: true },
}
let initialized = false

/** バリデーションチェック */
/**
 * 必須チェック
 * @param value
 */
const requiredValidation = (value: any) => {
  if (utils.isBlank(value)) return '入力必須項目です'
  return !!value || value === 0
}

/**
 * 整数チェック
 */
const integerValidation = (value: number | string | null) => {
  if (!value) return true
  const raw = String(value).replace(/,/g, '')
  return Number.isInteger(Number(raw)) || '整数を入力してください'
}

 /**
  * 最小値 / 最大値チェック
  * @param min 最小値
  * @param max 最大値
  */
const minMaxValidation = (min: number, max: number) => (v: any) => {
  if (v === null || v === undefined || v === '') return true
  const num = Number(String(v).replace(/,/g, ''))
  if (Number.isNaN(num)) return true
  if (num < min || num > max) {
    return `${min}～${max}の範囲で入力してください`
  }
  return true
}

/**
 * 適用開始日時チェック
 * ・適用終了日時が入力されている場合、開始 < 終了であること
 * @param row 対象行
 */
const validateEffectiveStartTime = (row: PriceInfo) => {
  return (value: string) => {
    if (!value || !row.effectiveEndTime) return true

    const start = $luxon.fromFormat(value, constants.format.datetimePicker)
    const end = $luxon.fromFormat(row.effectiveEndTime, constants.format.datetimePicker)

    if (!start.isValid || !end.isValid) return true

    return start < end || '適用終了日時より前の日時を入力してください'
  }
}

/**
 * 適用終了日時チェック
 * ・適用開始日時が入力されている場合、終了 > 開始であること
 * @param row 対象行
 */
const validateEffectiveEndTime = (row: PriceInfo) => {
  return (value: string) => {
    if (!value || !row.effectiveStartTime) return true

    const start = $luxon.fromFormat(row.effectiveStartTime, constants.format.datetimePicker)
    const end = $luxon.fromFormat(value, constants.format.datetimePicker)

    if (!start.isValid || !end.isValid) return true

    return end > start || '適用開始日時より後の日時を入力してください'
  }
}

/**
 * 料金表情報の型定義
 */
export interface PriceInfo {
  _key: string
  priceId: string | null
  price: number | ''
  priceType: number | ''
  pricePerUnit: number | ''
  effectiveStartTime: string
  effectiveEndTime: string
  processingType?: number // 1: 新規 / 2: 更新 / 3: 削除
  priority?: number | ''
}

/**
 * props 定義
 */
const props = defineProps<{
  modelValue: PriceInfo[]
  resourceType: number // リソース種別 1: 機体, 2: 離着陸場
}>()

/**
 * emits 定義
 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: PriceInfo[]): void
  (e: 'change', value: Omit<PriceInfo, '_key'>[]): void
}>()

/**
 * v-model ブリッジ
 * 親コンポーネントの priceInfos を直接操作する
 */
const priceInfos = computed<PriceInfo[]>({
  get: () => props.modelValue,
  set: (val: any) => emit('update:modelValue', val),
})

/**
 * 料金表情報を追加ボタン押下時の処理
 */
const addPriceRow = () => {
  priceInfos.value.push({
    _key: nanoid(),
    priceId: null,
    price: '',
    priceType: '',
    pricePerUnit: '',
    effectiveStartTime: '',
    effectiveEndTime: '',
    processingType: 1,
    priority: ''
  })
  emit('change', buildSubmitPriceInfos())
}

/**
 * 削除ボタン押下時の処理（料金表情報行削除）
 * @param index 行番号
 * ・priceIdあり → 論理削除（processingType = 3）
 * ・priceIdなし → 物理削除
 */
const removePriceRow = (index: number) => {
  const row = priceInfos.value[index]

  if (!row) return

  if (row.priceId) {
    Object.assign(row, {
      processingType: 3,
      price: '',
      priceType: '',
      pricePerUnit: '',
      effectiveStartTime: '',
      effectiveEndTime: '',
      priority: '',
    })
  } else {
    priceInfos.value.splice(index, 1)
  }

  emit('change', buildSubmitPriceInfos())
}

/**
 * API送信用 料金表情報へ変換
 */
const buildSubmitPriceInfos = (): Omit<PriceInfo, '_key'>[] => {
  let priorityIndex = 1

  return priceInfos.value.map((item: PriceInfo) => {
    const {
      _key,
      effectiveStartTime,
      effectiveEndTime,
      ...rest
    } = item

    const base: Omit<PriceInfo, '_key'> = {
      ...rest,
      // 適用開始日時：datetime-picker 形式（JST）→ UTC ISO 形式へ変換
      effectiveStartTime: item.effectiveStartTime ? $luxon.fromFormat(item.effectiveStartTime, constants.format.datetimePicker).toUTC().toISO({ suppressMilliseconds: true })! : '',
      // 適用終了日時：datetime-picker 形式（JST）→ UTC ISO 形式へ変換
      effectiveEndTime: item.effectiveEndTime ? $luxon.fromFormat(item.effectiveEndTime, constants.format.datetimePicker).toUTC().toISO({ suppressMilliseconds: true })! : '',
    }

    return item.processingType === 3
      ? base
      : {
          ...base,
          priority: priorityIndex++,
        }
  })
}

/**
 * 料金入力値の変換処理
 * @param value 
 * @param element 
 */
const onPriceInput = (value: string, element: any) => {
  const raw = value.replace(/,/g, '')
  const num = Number(raw)

  if (!Number.isNaN(num)) {
    // 数値として有効な場合のみ price に反映
    element.price = num
  } else {
    // 数値として不正な場合は null を設定
    element.price = null
  }
}

watch(
  priceInfos,
  () => {
    if (!initialized) {
      initialized = true
      return
    }
    emit('change', buildSubmitPriceInfos())
  },
  { deep: true }
)
</script>

<template>
  <v-row no-gutters align="center" class="price-block">
    <v-col class="d-flex align-center">
      <div>
        <div class="price-title pa-2 ml-4 font-weight-black v-label">
          <b>料金表管理</b>
        </div>
        <span class="ml-4">
          {{ resourceType === 1 ? '機体' : '離着陸場' }}を有料で運用する場合、料金表を設定してください
        </span>
      </div>

      <v-spacer />

      <v-btn
        variant="outlined"
        class="e-button-add-row mr-2"
        rounded="pill"
        @click="addPriceRow"
        :disabled="priceInfos.filter(x => x.processingType !== 3).length >= 100"
      >
        料金表情報を追加
      </v-btn>
    </v-col>
  </v-row>
  <v-table class="price-table" v-if="priceInfos.some(x => x.processingType !== 3)">
    <thead>
      <tr>
        <!-- 料金単価(円) -->
        <th><b v-if="formSetting.price.required" style="color: red">*</b>{{ formSetting.price.label }}</th>
        <!-- 料金タイプ -->
        <th><b v-if="formSetting.priceType.required" style="color: red">*</b>{{ formSetting.priceType.label }}</th>
        <!-- 時間単位 -->
        <th><b v-if="formSetting.pricePerUnit.required" style="color: red">*</b>{{ formSetting.pricePerUnit.label }}</th>
        <!-- 適用開始日時 -->
        <th><b v-if="formSetting.effectiveStartTime.required" style="color: red">*</b>{{ formSetting.effectiveStartTime.label }}</th>
        <!-- 適用終了日時 -->
        <th><b v-if="formSetting.effectiveEndTime.required" style="color: red">*</b>{{ formSetting.effectiveEndTime.label }}</th>
        <!-- 削除 -->
        <th></th>
      </tr>
    </thead>

    <draggable
      tag="tbody"
      :list="priceInfos"
      item-key="_key"
      handle=".drag-handle"
      animation="150"
    >
      <template #item="{ element, index }">
        <tr v-if="element.processingType !== 3">
          <!-- 料金単価(円) -->
          <td>
            <div class="d-flex align-start">
              <div class="drag-wrap">
                <v-icon size="24" class="drag-handle">
                  mdi-dots-vertical
                </v-icon>
              </div>

              <v-text-field
                :model-value="utils.formatPrice(element.price)"
                type="text"
                density="compact"
                variant="outlined"
                width="180"
                placeholder="例: 1,000"
                class="table-input table-input-number"
                :rules="[
                  ...(formSetting.price.required ? [requiredValidation] : []),
                  integerValidation,
                  minMaxValidation(
                    formSetting.price.min,
                    formSetting.price.max
                  )
                ]"
                @update:model-value="val => onPriceInput(val, element)"
              />
            </div>
          </td>

          <!-- 料金タイプ -->
          <td>
            <v-select
              v-model="element.priceType"
              :items="formSetting.priceType.options"
              item-value="value"
              item-title="title"
              density="compact"
              variant="outlined"
              width="180"
              class="table-input"
              :rules="formSetting.priceType.required ? [requiredValidation] : []"
            />
          </td>

          <!-- 時間単位 -->
          <td>
            <v-text-field
              v-model.number="element.pricePerUnit"
              type="number"
              :min="formSetting.pricePerUnit.min"
              :max="formSetting.pricePerUnit.max"
              density="compact"
              variant="outlined"
              width="180"
              class="table-input"
              :hide-spin-buttons="true"
              placeholder="例: 10"
              :rules="[
                ...(formSetting.pricePerUnit.required ? [requiredValidation] : []),
                integerValidation,
                minMaxValidation(
                  formSetting.pricePerUnit.min,
                  formSetting.pricePerUnit.max
                )
              ]"
            />
          </td>

          <!-- 適用開始日時 -->
          <td>
            <v-text-field
              v-model="element.effectiveStartTime"
              type="datetime-local"
              density="compact"
              variant="outlined"
              width="230"
              class="table-input"
              :rules="[
                ...(formSetting.effectiveStartTime.required ? [requiredValidation] : []),
                validateEffectiveStartTime(element),
              ]"
            />
          </td>

          <!-- 適用終了日時 -->
          <td>
            <v-text-field
              v-model="element.effectiveEndTime"
              type="datetime-local"
              density="compact"
              variant="outlined"
              width="230"
              class="table-input"
              :rules="[
                ...(formSetting.effectiveEndTime.required ? [requiredValidation] : []),
                validateEffectiveEndTime(element),
              ]"
            />
          </td>

          <!-- 操作 -->
          <td>
            <div class="price-action-col">
              <v-btn size="small" rounded="pill" variant="outlined" @click="removePriceRow(index)">
                削除
              </v-btn>
            </div>
          </td>
        </tr>
      </template>
    </draggable>
  </v-table>
</template>

<style>
input[type='number'] {
  text-align: right;
}
.price-block {
  background: var(--unnamed-color-eff2f6);
  min-height: 56px;
  border-radius: 8px;
}
.price-title{
  opacity: 1;
}

.drag-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
}
.drag-handle {
  cursor: grab;
  color: #9e9e9e;
}

.drag-handle:active {
  cursor: grabbing;
}

.price-table tr,
.price-table th,
.price-table td {
  border-bottom: none !important;
}

.v-table--density-default {
  --v-table-header-height: 35px !important;
  --v-table-row-height: 40px !important;
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

.price-table th::before {
  display: none !important;
  content: none !important;
}

.price-table th:first-child {
  padding-left: 5px !important;
}

.price-table td:first-child {
  padding-left: 0 !important;
}

input[type='datetime-local']  {
  display: block
}

input[type='number'] {
  text-align: right;
}

.price-action-col {
  display: flex;
  justify-content: center;
  margin-bottom: 22px;
}
.price-action-col .v-theme--light.v-btn--variant-outlined{
  width: 60px;
  color: var(--unnamed-color-e53935);
  border-color: var(--unnamed-color-e53935);
}

.price-table td {
  vertical-align: middle;
  padding: 8px 12px;
}

.price-table .table-input .v-field.v-field--variant-outlined {
  min-height: 30px !important;
  height: 30px !important;
}

.price-table .v-field__input {
  padding-top: 0;
  padding-bottom: 0;
  margin-top: -9px;
}
.price-table .v-field__append-inner {
  margin-top: -9px;
}

.price-table .table-input input,
.price-table .table-input .v-select__selection {
  height: 100%;
  line-height: 30px;
}

.table-input input::placeholder {
  text-align: center;
}
.table-input-number input {
  text-align: right;
}
</style>
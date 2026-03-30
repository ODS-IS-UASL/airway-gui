<script setup lang="ts">

/**
 * ペイロード情報の型定義
 */
export interface PayloadInfo {
  processingType: 1 | 2 | 3  // 1: 新規 2: 更新 3: 削除
  payloadId: string | null
  payloadName: string
  payloadDetailText: string
  imageData: string
  filePhysicalName: string
  fileData: string
}

/**
 * props 定義
 */
const props = withDefaults(
  defineProps<{
    dialogVisible: boolean
    isViewMode: boolean
    initialPayload?: PayloadInfo | null
  }>(),
  {
    initialPayload: null,
  },
)


/**
 * emits 定義
 */
const emit = defineEmits<{
  (e: 'update:dialogVisible', v: boolean): void
  (e: 'register', payload: PayloadInfo): void
}>()

/** ペイロード詳細テキスト最大文字数 */
const PAYLOAD_DETAIL_MAX = 1000
/** ペイロード名最大文字数 */
const PAYLOAD_NAME_MAX = 100
/** constants */
const { constants } = useMyConstant()
/** ダイアログ開閉状態（親と同期） */
const isOpen = ref(props.dialogVisible)

/**
 * フォーム用ペイロード情報
 */
const payloadForm = reactive<PayloadInfo>({
  processingType: 1,
  payloadId: null,
  payloadName: '',
  payloadDetailText: '',
  imageData: '',
  filePhysicalName: '',
  fileData: '',
})

const fileInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const validForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const validated = ref(false)
const isSubmitted = ref(false)

/** 
 * 新規モード判定
 */
const isAddMode = computed(() => !props.initialPayload?.payloadId)

/**
 * 送信ボタン表示文言
 */
const submitButtonText = computed(() => {
  if (props.initialPayload?.payloadId) return '更新'
  return '登録'
})

/**
 * フォーム内容を初期化する
 */
function resetForm() {
  Object.assign(payloadForm, {
    processingType: 1,
    payloadId: null,
    payloadName: '',
    payloadDetailText: '',
    imageData: '',
    filePhysicalName: '',
    fileData: '',
  })
}

/**
 * 初期ペイロード情報をフォームに反映する
 *
 * @param p 初期表示用ペイロード
 */
function initFromPayload(p: PayloadInfo | null) {
  resetForm()
  if (!p) {
    return
  }
  Object.assign(payloadForm, p)
}

/**
 * ダイアログ表示状態監視
 */
watch(
  () => props.dialogVisible,
  (v: boolean) => {
    isOpen.value = v
    if (v) {
      if (!props.initialPayload) {
        resetForm()
      } else {
        initFromPayload(props.initialPayload ?? null)
      }
    }
  },
)

/**
 * ダイアログ開閉状態を親へ通知
 */
watch(isOpen, (v: boolean) => emit('update:dialogVisible', v))


/** バリデーションチェック */
/**
 * 必須チェック
 * @param value
 */
const requiredValidation = (value) => {
  if (utils.isBlank(value)) return '入力必須項目です'
  return !!value || value === 0
}

/**
 * 最大文字数チェック用バリデーション
 *
 * @param max 最大文字数
 */
const maxLengthRule = (max: number) => (v: string) => {
  if (utils.isBlank(v)) return true
  if (v.length > max) return `${max}文字以内で入力してください`
  return true
}

/**
 * 添付ファイル必須エラーメッセージ
 */
const fileRequiredError = computed(() => {
  if (!isSubmitted.value) return []
  if (utils.isBlank(payloadForm.filePhysicalName)) {
    return ['入力必須項目です']
  }
  return []
})

/**
 * 画像ファイル選択ダイアログを開く
 */
function selectImage() {
  imageInput.value?.click()
}

/**
 * 画像ファイル選択時の処理
 */
function onImageChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]

  // 2MB 以上は不可
  if (file.size >= 2097152) return
  const reader = new FileReader()
  reader.onload = () => {
    const s = String(reader.result)
    if (s.length <= 5242880) payloadForm.imageData = s
  }
  reader.readAsDataURL(file)
  input.value = ''
}

/**
 * 画像を削除する
 */
function deleteImage() {
  payloadForm.imageData = ''
}

/**
 * 添付ファイルを削除する
 */
function removeFile() {
  payloadForm.filePhysicalName = ''
  payloadForm.fileData = ''
}

/**
 * 添付ファイル選択ダイアログを開く
 */
function selectFile() {
  fileInput.value?.click()
}

/**
 * ファイル選択時の処理
 * @param event ファイル選択イベント
 */
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  
  // 1GB を超える場合は処理しない
  if (file.size > constants.file.maxSize) {
    if (input) input.value = ''
    return
  }

  // 拡張子を除いた論理名
  const payloadLogicalName = file.name.replace(/\.[^/.]+$/, '')
  if (payloadLogicalName.length > constants.file.maxLength.fileLogicalName) {
    // ファイル論理名 maxLength 超過
    if (input) input.value = ''
    return
  }

  // 拡張子含む物理名
  const payloadFilePhysicalName = file.name
  if (payloadFilePhysicalName.length > constants.file.maxLength.filePhysicalName) {
    // ファイル物理名 maxLength 超過
    if (input) input.value = ''
    return
  }

  payloadForm.filePhysicalName = payloadFilePhysicalName
  const reader = new FileReader()
  reader.onload = () => {
    payloadForm.fileData = String(reader.result)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

/**
 * 登録 / 更新処理
 */
async function submit() {

  isSubmitted.value = true

  const { valid } = await validForm.value?.validate()
  if (!valid || fileRequiredError.value.length > 0) return

  payloadForm.processingType = isAddMode.value ? 1 : 2
  emit('register', { ...payloadForm })
  isOpen.value = false
}

/**
 * キャンセル処理
 */
function cancel() {
  isOpen.value = false
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    no-click-animation
    width="65%"
    max-width="800"
    persistent
  >
    <v-card>
      <div class="title-header">
        <div class="payload-title font-weight-black v-label">
          ペイロード情報
        </div>
      </div>
      <v-card-text class="compact-form">
        <v-form
          ref="validForm"
          v-model="validated"
          validate-on="submit"
        >
          <v-row class="mt-2">
            <v-col cols="6">
              <label class="form-label">
                <p>ペイロードID</p>
              </label>
              <v-text-field
                :model-value="isAddMode ? '自動採番' : (payloadForm.payloadId ?? '')"
                variant="outlined"
                dense
                hide-details
                disabled
                style= "height: 28px; margin-bottom: 8px"
                class="small-text-field"
              />
            </v-col>
            <v-col cols="6">
              <label class="form-label">
                <p><b v-if="!isViewMode" style="color: red">*</b>ペイロード名</p>
              </label>
              <v-text-field
                v-model="payloadForm.payloadName"
                variant="outlined"
                dense
                :placeholder="'ペイロード名を入力してください'"
                :maxlength="PAYLOAD_NAME_MAX"
                :rules="[requiredValidation, maxLengthRule(PAYLOAD_NAME_MAX)]"
                :disabled="isViewMode"
                hide-details="auto"
                class="small-text-field"
              />
            </v-col>
          </v-row>
          <v-row
            class="mt-1 payload-row align-items-start">
            <v-col cols="6" class="payload-image-col">
              <v-sheet
                :border="payloadForm.imageData ? 'sm' : false"
                :class="['payload-image-sheet', { 'no-image': !payloadForm.imageData }]"
              >
                <img
                  v-if="payloadForm.imageData"
                  :src="payloadForm.imageData"
                  class="payload-image"
                />
                <div
                  v-else
                  class="payload-image-placeholder"
                >
                  <b class="mt-2">
                    ペイロード画像
                  </b>
                </div>
              </v-sheet>
              <div v-if="!isViewMode" class="payload-image-buttons">
                <div class="e-button-action">
                  <v-btn
                    rounded="pill"
                    variant="outlined"
                    size="small"
                    @click="selectImage"
                  >
                    参照
                  </v-btn>
                </div>
                <div class="delete-button">
                  <v-btn
                    rounded="pill"
                    variant="outlined"
                    size="small"
                    :disabled="!payloadForm.imageData"
                    @click="deleteImage"
                  >
                    削除
                  </v-btn>
                </div>
                <v-file-input
                  ref="imageInput"
                  style="display:none;"
                  accept=".png,.jpeg,.heif"
                  @change="onImageChange"
                />
              </div>
            </v-col>
            <v-col cols="6" class="payload-detail-col">
              <label class="form-label payload-detail-label">
                <p>ペイロード詳細</p>
              </label>
              <v-textarea
                v-model="payloadForm.payloadDetailText"
                variant="outlined"
                dense
                :placeholder="'ペイロード詳細を入力してください'"
                :maxlength="PAYLOAD_DETAIL_MAX"
                :rules="[maxLengthRule(PAYLOAD_DETAIL_MAX)]"
                :disabled="isViewMode"
                hide-details="auto"
                class="payload-detail-textarea"
                rows="4"
                no-auto-grow
              />
              <div class="d-flex align-center justify-space-between mt-4">
                <label class="form-label">
                  <p><b v-if="!isViewMode" style="color: red">*</b>添付ファイル</p>
                </label>
                <v-btn
                  class="e-button-action"
                  :class="{ 'field-name-input': !isViewMode }"
                  size="small"
                  rounded="pill"
                  variant="outlined"
                  @click="selectFile"
                  v-if="!isViewMode"
                >
                  添付ファイルを追加
                </v-btn>
                <v-file-input
                  ref="fileInput"
                  class="d-none"
                  :accept="constants.file.allowedTypes.join(',')"
                  @change="onFileChange"
                />
              </div>
              <div
                v-if="fileRequiredError.length"
                class="text-error text-caption"
              >
                {{ fileRequiredError[0] }}
              </div>
            </v-col>
          </v-row>
          <v-row class="mt-0">
            <v-col cols="6"/>
            <v-col cols="6">
              <div class="file-chip-wrapper">
                <v-chip
                  v-if="payloadForm.filePhysicalName"
                  class="ma-1 file-payload-chip"
                  :closable="!isViewMode"
                  variant="flat"
                  rounded="0"
                  close-icon="mdi-close"
                  @click:close="removeFile"
                  @click="(isViewMode || payloadForm.payloadId) ? useRestApiFileDownloadPayloadFile(payloadForm.payloadId!) : null"
                >
                  <div :class="payloadForm.payloadId ? 'link-chip' : ''">{{ payloadForm.filePhysicalName }}</div>
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="mb-2 mx-4">
        <v-row
          justify="end"
          class="px-2"
        >
          <v-btn
            v-if="!isViewMode"
            class="mx-2 dialog-button dialog-action-button"
            rounded="pill"
            variant="outlined"
            density="compact"
            @click="cancel"
          >
            キャンセル
          </v-btn>
          <v-btn
            v-if="!isViewMode"
            class="mx-2 dialog-button dialog-action-button dialog-action-button-register"
            rounded="pill"
            variant="outlined"
            density="compact"
            @click="submit"
          >
            {{ submitButtonText }}
          </v-btn>
          <v-btn
            v-if="isViewMode"
            class="mx-2 dialog-button dialog-action-button"
            rounded="pill"
            variant="outlined"
            density="compact"
            @click="cancel"
          >
            閉じる
          </v-btn>
        </v-row>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.title-header {
  background-color: var(--unnamed-color-eff2f6);
  border-radius: 8px;
  padding: 11px 20px;
  margin: 10px 15px;
  height: 50px;
}

.payload-title {
  opacity: 1;
}

.payload-row {
  align-items: flex-start;
}

.payload-image-col,
.payload-detail-col {
  display: flex;
  flex-direction: column;
}

.payload-image-sheet {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  height: calc(1.75rem + 200px);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

.payload-image-sheet.no-image {
  border: none !important;
  background-color: var(--unnamed-color-eff2f6);
}

.payload-image,
.payload-image-placeholder {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.payload-image {
  object-fit: contain;
  object-position: center;
}

.payload-image-placeholder {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  background-color: var(--unnamed-color-eff2f6);
  font-size: 14px;
}

.payload-image-buttons {
  display: flex;
  justify-content: space-around;
  padding: 0 20px;
  margin-top: 8px;
}

.payload-image-buttons :deep(.v-btn) {
  min-width: 80px;
}

.delete-button :deep(.v-btn) {
  border-color: var(--unnamed-color-e53935) !important;
  color: var(--unnamed-color-e53935) !important;
}

.payload-detail-textarea {
  height: 200px;
}

.payload-detail-textarea :deep(.v-field),
.payload-detail-textarea :deep(.v-field__input),
.payload-detail-textarea :deep(textarea) {
  height: 200px;
  min-height: 200px;
  max-height: 200px;
}

.file-payload-chip {
  background: #d6eeeb;
  color: #4281c5;
  cursor: default;
  height: auto !important;
  min-height: 30px !important;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
  line-height: 1.4;
  max-width: 100%;
}

.link-chip {
  text-decoration: underline;
  cursor: pointer;
}

.compact-form {
  padding: 8px 55px !important;
}

.compact-form :deep(.form-label) {
  margin-bottom: 4px;
}

.compact-form :deep(.v-row) {
  margin-bottom: 4px;
}

.compact-form :deep(.v-col) {
  padding-top: 4px;
  padding-bottom: 4px;
}

.file-add-button-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.file-chip-wrapper {
  margin-top: -8px;
}

.dialog-action-button {
  min-width: 150px !important;
  min-height: 30px;
  
}

.dialog-action-button-register {
  background: #2c69ff !important;
  color: var(--unnamed-color-ffffff) !important;
  
}

.small-text-field :deep(.v-input__control),
.small-text-field :deep(.v-field__field),
.small-text-field :deep(.v-field__input) {
  height: 30px;
  min-height: 30px;
}
</style>
// 定数定義
const constants = {
  version: '1.0.0',
  dialogType: {
    confirm: 'confirm',
    info: 'info',
    error: 'error' },
  format: {
    datetime: 'yyyy/MM/dd HH:mm',
    // 料金表管理改修  Start
    datetimeWithSeconds: 'yyyy/MM/dd HH:mm:ss',
    // 料金表管理改修  End
    time: 'HH:mm',
    date: 'yyyy/MM/dd',
    datePicker: 'yyyy-MM-dd',
    datetimePicker: `yyyy-MM-dd'T'HH:mm`,
  },
  // 料金表管理改修  Start
  file: {
    maxSize: 1024 * 1024 * 1024, // 1GB
    allowedTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/pdf',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
      'application/vnd.apple.pages',
      'application/vnd.apple.numbers',
      'application/vnd.apple.keynote',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'application/x-js-taro',
      'text/plain',
      'application/rtf',
      'text/csv',
      'text/tab-separated-values',
      'application/json',
      'application/xml',
      'application/x-yaml',
      'image/png',
      'image/jpeg',
    ],
    maxLength: {
      fileLogicalName: 100,
      filePhysicalName: 200,
    },
  },
  // 料金表管理改修  End
} as const

export { constants }

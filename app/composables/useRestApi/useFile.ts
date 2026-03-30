/**
 * レスポンスからファイルをダウンロードする
 *
 * @param res fetch API の Response オブジェクト
 */
const downloadFromResponse = async (res: Response) => {
  // ステータスが正常でない場合は処理を中断
  if (!res.ok) return

  const blob = await res.blob()

  // Content-Disposition ヘッダーからダウンロードファイル名を取得する
  const disposition = res.headers.get('Content-Disposition') || ''
  // デフォルトのファイル名（ヘッダーにファイル名が含まれない場合に使用）
  let filename = 'download'

  // RFC5987形式の filename* を取得する
  // 例： filename*=UTF-8''sample.txt
  // ※ filename* はURLエンコードされている場合がある
  const filenameStarMatch = disposition.match(/filename\*=([^']*)'[^']*'(.+)/i)

  if (filenameStarMatch) {
    try {
      // filename* の場合、URLエンコードされた文字列が格納されている可能性があるため
      // decodeURIComponent でデコードして元の文字列に変換する
      // 例：sample%20file.txt → sample file.txt
      filename = decodeURIComponent(filenameStarMatch[2])
    } catch {
      // デコードに失敗した場合（URLエンコードされていない場合など）
      // 元の値をそのままファイル名として使用する
      filename = filenameStarMatch[2]
    }
  } else {
    // 通常の filename を取得する
    // 例： filename="sample.txt"
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
    if (filenameMatch) {
      filename = filenameMatch[1]
    }
  }

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

/**
 * 機体補足資料ファイルをダウンロードする処理
 *
 * @param aircraftId 機体ID
 * @param fileId 補足資料ID
 */
export const useRestApiFileDownloadFile = async (aircraftId: any, fileId: any) => {
  if (!aircraftId || !fileId) return
  // 機体補足資料ダウンロードAPIを呼び出し
  const res = await fetch(`/api/drone/aircraft/info/detail/${aircraftId}/${fileId}`, {
    method: 'GET',
  });

  // レスポンスからファイルをダウンロード
  await downloadFromResponse(res)
}

/**
 * ペイロード添付ファイルをダウンロードする処理
 *
 * @param payloadId ペイロードID
 */
export const useRestApiFileDownloadPayloadFile = async (payloadId: any) => {
  if (!payloadId) return
  // ペイロード添付ファイルダウンロードAPIを呼び出し
  const res = await fetch(`/api/drone/aircraft/info/payload/${payloadId}`, {
    method: 'GET',
  });

  // レスポンスからファイルをダウンロード
  await downloadFromResponse(res)
}
import { ref } from 'vue'

/**
 * テーブル列幅をドラッグで変更できるようにするcomposable
 * @param initialWidths - 列key と初期幅(px) のマップ
 */
export function useColumnResize(initialWidths: Record<string, number>) {
  const columnWidths = ref<Record<string, number>>({ ...initialWidths })

  let resizingKey: string | null = null
  let startX = 0
  let startWidth = 0

  function startResize(event: MouseEvent, key: string) {
    resizingKey = key
    startX = event.clientX
    startWidth = columnWidths.value[key] ?? 100

    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
  }

  function onResize(event: MouseEvent) {
    if (!resizingKey) return
    const diff = event.clientX - startX
    columnWidths.value[resizingKey] = Math.max(50, startWidth + diff)
  }

  function stopResize() {
    resizingKey = null
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  return { columnWidths, startResize }
}

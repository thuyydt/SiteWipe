import { sendExtensionMessage } from '@/composables/useMessaging'
import type { SnapshotRecord } from '@/lib/schema'

export async function loadSnapshots(): Promise<SnapshotRecord[]> {
  const r = await sendExtensionMessage<{ ok: boolean; snapshots?: SnapshotRecord[] }>(
    { type: 'LOAD_SNAPSHOTS' },
  )
  return r.ok && r.snapshots ? r.snapshots : []
}

export async function persistSnapshots(list: SnapshotRecord[]): Promise<void> {
  await sendExtensionMessage({ type: 'SAVE_SNAPSHOTS', snapshots: list })
}

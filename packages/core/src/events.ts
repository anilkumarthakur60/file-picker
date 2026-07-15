import type { MediaItem } from './types'

/** Events emitted by a {@link FilePicker}, with their argument tuples. */
export interface FilePickerEventMap {
  /** The dialog opened. */
  open: []
  /** The dialog closed (via Done, Close, or Esc). */
  close: []
  /** The selection changed (any add/remove/clear). */
  change: [items: MediaItem[]]
  /** The selection was confirmed with "Done". */
  select: [items: MediaItem[]]
  /** Files finished uploading. */
  upload: [items: MediaItem[]]
  /** An item was deleted. */
  delete: [item: MediaItem]
  /** An adapter operation threw. */
  error: [error: unknown]
  /** The color theme changed. */
  theme: [theme: 'light' | 'dark' | 'auto']
}

export type FilePickerEventName = keyof FilePickerEventMap

type Listener<E extends FilePickerEventName> = (...args: FilePickerEventMap[E]) => void
type AnyListener = (...args: never[]) => void

/** A tiny, fully-typed event emitter. */
export class Emitter {
  private readonly listeners = new Map<FilePickerEventName, Set<AnyListener>>()

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<E extends FilePickerEventName>(event: E, listener: Listener<E>): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener as AnyListener)
    return () => this.off(event, listener)
  }

  /** Unsubscribe a previously-registered listener. */
  off<E extends FilePickerEventName>(event: E, listener: Listener<E>): void {
    this.listeners.get(event)?.delete(listener as AnyListener)
  }

  /**
   * Emit an event to all subscribers. A throwing subscriber is isolated so it
   * can neither abort the other listeners nor unwind back into engine internals.
   */
  emit<E extends FilePickerEventName>(event: E, ...args: FilePickerEventMap[E]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of [...set]) {
      try {
        ;(listener as Listener<E>)(...args)
      } catch (err) {
        // Never re-enter on the 'error' channel — that would risk a loop.
        if (event !== 'error' && typeof console !== 'undefined') {
          console.error('[file-picker] an event listener threw:', err)
        }
      }
    }
  }

  /** Drop every listener. */
  clear(): void {
    this.listeners.clear()
  }
}

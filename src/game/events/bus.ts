import type { GameEventMap } from '../../types/game'

type EventName = keyof GameEventMap
type Listener<K extends EventName> = (payload: GameEventMap[K]) => void

class TypedEventBus {
  private listeners = new Map<EventName, Set<(payload: never) => void>>()

  on<K extends EventName>(event: K, listener: Listener<K>): () => void {
    let group = this.listeners.get(event)
    if (!group) {
      group = new Set()
      this.listeners.set(event, group)
    }
    const stored = listener as (payload: never) => void
    group.add(stored)
    return () => this.off(event, listener)
  }

  off<K extends EventName>(event: K, listener: Listener<K>): void {
    const group = this.listeners.get(event)
    if (!group) {
      return
    }
    group.delete(listener as (payload: never) => void)
    if (group.size === 0) {
      this.listeners.delete(event)
    }
  }

  emit<K extends EventName>(event: K, payload: GameEventMap[K]): void {
    const group = this.listeners.get(event)
    if (!group) {
      return
    }
    for (const listener of Array.from(group)) {
      ;(listener as Listener<K>)(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const gameBus = new TypedEventBus()

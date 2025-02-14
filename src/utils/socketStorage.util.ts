import { AsyncLocalStorage } from 'async_hooks'

export const SocketIdStorage = {
  storage: new AsyncLocalStorage<string>(),
  get() {
    return this.storage.getStore()
  },
  set(id: string) {
    return this.storage.enterWith(id)
  },
}
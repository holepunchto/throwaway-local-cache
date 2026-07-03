import fs from 'fs/promises'
import Cache from './index.js'

const c = new Cache('cache.json', {
  async load (folder) {
    try {
      return JSON.parse(await fs.readFile(folder))
    } catch {
      return null // nothing persisted yet
    }
  },
  async save (folder, data) {
    await fs.writeFile(folder, data)
  }
})

await c.get('hello')
c.queuePut('hello', 'world2')

await c.flush() // force persist it now

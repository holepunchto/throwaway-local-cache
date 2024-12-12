const fs = require('fs')
const path = require('path')

const FLUSH_TIMEOUT = 10_000

module.exports = class ThrowawayLocalCache {
  constructor (folder) {
    this.db = null
    this.folder = folder
    this.dirty = false
    this.timeout = null
    this.opening = null
    this.flushing = null
    this.flushBound = this.flush.bind(this)
  }

  open () {
    if (this.opening) return this.opening
    this.opening = this._open()
    return this.opening
  }

  async _open () {
    let existing = null

    try {
      const data = await fs.promises.readFile(path.join(this.folder, 'db.json'), 'utf-8')
      existing = JSON.parse(data)
    } catch {}

    if (existing === null) {
      await fs.promises.mkdir(this.folder, { recursive: true })
    }

    this.db = existing || {}
  }

  async get (key) {
    while (!this.db) await this.open()
    return this.db[key] || null
  }

  async getAllKeys () {
    while (!this.db) await this.open()
    return this.db ? Object.keys(this.db) : []
  }

  queueFlush () {
    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = setTimeout(this.flushBound, FLUSH_TIMEOUT)
    if (this.timeout.unref) this.timeout.unref()
  }

  queuePut (key, doc) {
    if (!this.db) {
      this._openAndQueuePut(key, doc)
      return
    }

    this.db[key] = doc
    this.dirty = true
    this.queueFlush()
  }

  async _openAndQueuePut (key, doc) {
    try {
      await this.open()
    } catch {
      return // runs in bg
    }
    this.queuePut(key, doc)
  }

  queueDelete (key) {
    if (!this.db) {
      this._openAndQueueDelete(key)
      return
    }

    delete this.db[key]
    this.dirty = true
    this.queueFlush()
  }

  async _openAndQueueDelete (key) {
    try {
      await this.open()
    } catch {
      return // runs in bg
    }
    this.queueDelete(key)
  }

  async flush () {
    if (this.timeout) clearTimeout(this.timeout)
    this.timeout = null

    if (this.flushing) return this.flushing
    this.flushing = this._flush()
    try {
      await this.flushing
    } finally {
      this.flushing = null
    }
  }

  async _flush () {
    if (!this.dirty) return
    const data = JSON.stringify(this.db)
    this.dirty = false
    await fs.promises.writeFile(path.join(this.folder, 'db.json.tmp'), data)
    await fs.promises.rename(path.join(this.folder, 'db.json.tmp'), path.join(this.folder, 'db.json'))
  }
}

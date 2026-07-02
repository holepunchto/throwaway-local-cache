const FLUSH_TIMEOUT = 10_000

module.exports = class ThrowawayLocalCache {
  constructor (folder, { load, save }) {
    this.db = null
    this.folder = folder
    this.dirty = false
    this.timeout = null
    this.opening = null
    this.flushing = null
    this.flushBound = this.flush.bind(this)
    this._save = save
    this._load = load
  }

  open () {
    if (this.opening) return this.opening
    this.opening = this._open()
    return this.opening
  }

  async _open () {
    this.db = await this._load(this.folder) || {}
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

  async queueDeleteAll () {
    if (!this.db) {
      try {
        await this.open()
      } catch {
        return // runs in bg
      }
    }

    this.db = {}
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
    await this._save(this.folder, data)
  }
}

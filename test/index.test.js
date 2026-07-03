const test = require('brittle')
const Cache = require('../index.js')

function createStore (initial = null) {
  const store = { data: initial, saves: 0 }
  const load = async (folder) => (store.data === null ? null : { ...store.data })
  const save = async (folder, data) => {
    store.saves++
    store.data = JSON.parse(data)
  }
  return { store, load, save }
}

test('get returns null for missing key', async (t) => {
  const { load, save } = createStore()
  const c = new Cache('folder', { load, save })

  t.is(await c.get('missing'), null)
})

test('get returns loaded value', async (t) => {
  const { load, save } = createStore({ hello: 'world' })
  const c = new Cache('folder', { load, save })

  t.is(await c.get('hello'), 'world')
})

test('queuePut before open opens and stores', async (t) => {
  const { load, save } = createStore()
  const c = new Cache('folder', { load, save })

  c.queuePut('key', 'value')

  t.is(await c.get('key'), 'value')
})

test('queuePut then get returns the value', async (t) => {
  const { load, save } = createStore()
  const c = new Cache('folder', { load, save })

  await c.get('key') // opens the db
  c.queuePut('key', { value: true })

  t.alike(await c.get('key'), { value: true })
})

test('queueDelete removes a key', async (t) => {
  const { load, save } = createStore({ a: 1, b: 2 })
  const c = new Cache('folder', { load, save })

  await c.get('a')
  c.queueDelete('a')

  t.is(await c.get('a'), null)
  t.is(await c.get('b'), 2)
})

test('queueDeleteAll clears the db', async (t) => {
  const { load, save } = createStore({ a: 1, b: 2 })
  const c = new Cache('folder', { load, save })

  await c.queueDeleteAll()

  t.alike(await c.getAllKeys(), [])
})

test('getAllKeys returns all keys', async (t) => {
  const { load, save } = createStore({ a: 1, b: 2, c: 3 })
  const c = new Cache('folder', { load, save })

  t.alike((await c.getAllKeys()).sort(), ['a', 'b', 'c'])
})

test('flush persists dirty data via save', async (t) => {
  const { store, load, save } = createStore()
  const c = new Cache('folder', { load, save })

  await c.open()
  c.queuePut('key', 'value')
  await c.flush()

  t.is(store.saves, 1)
  t.alike(store.data, { key: 'value' })
})

test('flush is a no-op when not dirty', async (t) => {
  const { store, load, save } = createStore({ a: 1 })
  const c = new Cache('folder', { load, save })

  await c.get('a')
  await c.flush()

  t.is(store.saves, 0)
})

test('open is idempotent', async (t) => {
  let loads = 0
  const load = async () => { loads++; return { a: 1 } }
  const save = async () => {}
  const c = new Cache('folder', { load, save })

  await Promise.all([c.open(), c.open(), c.open()])

  t.is(loads, 1)
})

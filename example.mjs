import Cache from './index.js'

const c = new Cache('cache')

const value = await c.get('hello')

c.queuePut('hello', 'world2')

setInterval(() => {}, 1000)

console.log(value)

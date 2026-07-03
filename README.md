# throwaway-local-cache

```
npm install throwaway-local-cache
```

## Usage

``` js
const c = new Cache('./cache', {
  async load (folder) {
    // return the previously saved object, or null if there is nothing yet
  },
  async save (folder, data) {
    // persist the serialized string
  }
})

const c = new Cache('./cache') // pass the local folder to use

await c.get('key') // get an entry

c.queuePut('key', { value: true }) // queue a put, will be persisted later
c.queueDelete('key') // queue a deletion, will be persisted later

await c.flush() // force persist it
```

## License

Apache-2.0

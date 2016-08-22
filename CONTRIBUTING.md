# Contributing to apollo-passport-rethinkdbdash

First see https://github.com/apollo-passport/apollo-passport/blob/master/CONTRIBUTING.md.  There is important information here relevant to all apollo-passport projects.

## RethinkDBDash specifics

### Testing

Since tests are isolated, we create our own `r` (rethinkdbdash) instance, with the following info:

```js
const host = process.env.RETHINKDB_HOST || '127.0.0.1';
const port = process.env.RETHINKDB_PORT || 28015;
```

### Concurrency and disposable databases

Tests are designed to support paralellism such as e.g. with `wallabyjs`.  This is done by creating a "disposable" `r` instance (with it's own disposable database) for each test suite (see `index.spec.js`).  Failing tests unfortunately will leave `tmp124151` databases around.  You can use the `del_tmp.js` script to clean them up.

### CircleCI

The `circle.yml` file includes the necessary commands to setup RethinkDB on CircleCI.  This is only required for databases not included on CircleCI by default.

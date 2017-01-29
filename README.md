# apollo-passport-mongodb

Forked from [tomitrescak/apollo-passport-mongodb](https://github.com/tomitrescak/apollo-passport-mongodb)
MongoDB native driver for apollo-passport


[![npm](https://img.shields.io/npm/v/apollo-passport-mongodb.svg?maxAge=2592000)](https://www.npmjs.com/package/apollo-passport-mongodb) [![Circle CI](https://circleci.com/gh/tomitrescak/apollo-passport-mongodb.svg?style=shield)](https://circleci.com/gh/tomitrescak/apollo-passport-mongodb) [![Coverage Status](https://coveralls.io/repos/github/tomitrescak/apollo-passport-mongodb/badge.svg?branch=master)](https://coveralls.io/github/tomitrescak/apollo-passport-mongodb?branch=master) ![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

Copyright (c) 2016 by Gilad Shoham, released under the MIT license.

## New Features in this fork (Highlights)
* Add verifyUserAccount function
* Add function to add reset password tokens
* Add update user function
* Follow emails standard from here: [passportjs-profile](http://passportjs.org/docs/profile)

## Usage

```js
import { MongoClient } from 'mongodb';
import MongoDriver from 'apollo-passport-mongodb-driver';

// However you usually create your mongodb instance
const m = await MongoClient.connect(`mongodb://${host}:${port}/${name}`);

// Pass to apollo passport at creation time
const apolloPassport = new ApolloPassport({
  // along with any other relevant options
  db: new MongoDriver(m)
});
```

**Optional parameters**, e.g. if your `users` table is called something else:

```js
new MongoDriver(r, {
  userTableName: 'users',
  configTableName: 'apolloPassportConfig',
  db: '(override default database given to mongo)'
});
```

See [apollo-passport](https://github.com/apollo-passport/apollo-passport) and [apollo-passport-local-strategy](https://github.com/GiladShoham/apollo-passport-local-strategy) for more info.

## Create your own DBDriver

This package is fully documented with 100% test coverage.  It can be used as a basis for creating other DBDrivers for Apollo Passport.

See also the [API Docs](docs/api/apollo-passport-rethinkdbdash), ordered by version and viewable online via rawgit, e.g. [v0.0.2 API Docs on RawGit](https://cdn.rawgit.com/apollo-passport/rethinkdbdash/master/docs/api/apollo-passport-rethinkdbdash/0.0.2/RethinkDBDashDriver.html).

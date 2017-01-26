import chai from 'chai';
import 'regenerator-runtime/runtime';

import { MongoClient } from 'mongodb';
import MongoDriver from './index';
//import deleteTemps from './del_tmp';

const should = chai.should();

const host = process.env.MONGODB_HOST || '127.0.0.1';
const port = process.env.MONGODB_PORT || 27017;

// not really disposable, no way to get an instance with a different
// database, too expensive to open new connection for each test, but
// this will still work as "intended" for single thread tests.
async function disposable() {
  //await deleteTemps();

  const name = "tmp" + Math.floor(Math.random() * 10000);
  //const mongoclient = db = yield MongoClient.connect(url);

  const db = await MongoClient.connect(`mongodb://${host}:${port}/${name}`);

  db.dispose = async function () {
    await db.dropDatabase();
  };

  return db;
}

describe('apollo-passport-mongodb', () => {

  // sufficiently tested by other tests for now
  describe('constructor()', () => {

    it('accepts options', () => {
      const r = { db() { } };
      const options = {
        init: false,
        userTableName: 'personnel'
      };

      const db = new MongoDriver(r, options);

      db.userTableName.should.equal(options.userTableName);
    });

  });

  it('ready()', async () => {
    const r = await disposable();
    const db = new MongoDriver(r);
    await db._ready();

    // now do a fake init
    db.initted = false;
    db.readySubs.length.should.equal(0);
    db._ready();
    db.readySubs.length.should.equal(1);
    db.readySubs.shift().call();

    db.initted = true;
    db.readySubs.length.should.equal(0);
    db._ready();
    db.readySubs.length.should.equal(0);

    await r.dispose();
  });

  it('config; database & local output', async () => {

    const r = await disposable();
    const db = new MongoDriver(r);

    await db.setConfigKey('test', 'test1', { a: 1 });
    const data = await db.fetchConfig();
    data.should.deep.equal({
      test: {
        test1: {
          type: 'test',
          _id: 'test1',
          a: 1
        }
      }
    });

    await r.dispose();

  });

  describe('users', () => {

    describe('createUser()', () => {

      let r;
      before(async () => { r = await disposable(); });
      after(async () => { await r.dispose(); });

      it('inserts a user and returns the id when no id given', async () => {
        const db = new MongoDriver(r);
        await db._ready();
        await db.users.removeMany();

        const user = { name: 'John Sheppard' };
        const id = await db.createUser(user);

        const users = await db.users.find().toArray();
        const added = users[0];

        added.name.should.equal(user.name);
        id.should.equal(added._id);

        await db.users.removeMany();
      });

      it('inserts a user and returns the id when an id is given', async () => {
        const db = new MongoDriver(r);
        await db._ready();
        await db.users.removeMany();

        const user = { _id: 'sheppard', name: 'John Sheppard' };
        const id = await db.createUser(user);

        const users = await db.users.find().toArray();
        const added = users[0];

        added.name.should.equal(user.name);
        id.should.equal(added._id);

        await db.users.removeMany();
      });

    });

  describe('fetching', () => {

      const users = [
        {
          _id: "sheppard",
          emails: [
            { value: "sheppard@atlantis.net" }
          ],
          services: {
            facebook: {
              id: "1"
            }
          }
        },
        {
          _id: "mckay",
          emails: [
            { value: "mckay@atlantis.net" }
          ]
        }
      ];

      let r, db;
      before(async () => {
        r = await disposable();
        db = new MongoDriver(r);
        await db._ready();
        await db.users.insert(users);
      });
      after(async () => { r.dispose(); });

      describe('fetchUserById', () => {

        it('returns a matching user if one exists', async () => {
          const user = await db.fetchUserById('sheppard');
          user._id.should.equal("sheppard");
        });

        it('returns null on no match', async () => {
          const user = await db.fetchUserById('todd');
          should.equal(user, null);
        });

      });

      describe('fetchUserByEmail()', () => {

        it('returns a matching user if one exists', async () => {
          const user = await db.fetchUserByEmail('mckay@atlantis.net');
          user._id.should.equal("mckay");
        });

        it('returns null on no match', async () => {
          const user = await db.fetchUserByEmail('non-existing-email');
          should.equal(user, null);
        });

      });

      describe('fetchUserByServiceIdOrEmail()', () => {

        it('matches by email', async () => {
          const user = await db.fetchUserByServiceIdOrEmail('facebook', "no-match", 'mckay@atlantis.net');
          user._id.should.equal("mckay");
        });

        it('matches by service', async () => {
          const user = await db.fetchUserByServiceIdOrEmail('facebook', "1", 'non-matching-email');
          user._id.should.equal("sheppard");
        });

        it('should return null on no match', async () => {
          const user = await db.fetchUserByServiceIdOrEmail('no-service', 'no-id', 'no-email');
          should.equal(user, null);
        });

      });

      describe('assertUserEmailData()', () => {

        it('adds a new email address', async () => {
          await db.assertUserEmailData('mckay', 'mckay@sgc.mil');

          const user = await db.fetchUserByEmail('mckay@sgc.mil');
          should.exist(user);
        });

        it('updates/replaces an existing email address + data', async () => {
          const email = 'mckay@atlantis.net';
          await db.assertUserEmailData('mckay', email, { verified: true });

          const user = await db.fetchUserByEmail(email);
          const data = user.emails.find(data => data.value === email);
          data.should.deep.equal({ value: email, verified: true });
        });

      });

      describe('assertUserServiceData()', () => {

        it('adds a new service record', async () => {
          await db.assertUserServiceData('mckay', 'facebook', { id: '5' });

          const user = await db.fetchUserByServiceIdOrEmail('facebook', '5', null);
          user.services.facebook.id.should.equal('5');
        });

        it('updates/replaces an existing service record', async () => {
          await db.assertUserServiceData('mckay', 'facebook', { id: '5' });

          const user = await db.fetchUserByServiceIdOrEmail('facebook', '5', null);
          user.services.facebook.id.should.equal('5');
        });

      });

      it('mapUserToServiceData', () => {
        const fb = db.mapUserToServiceData(users[0], 'facebook');
        fb.should.deep.equal(users[0].services.facebook);
      });

    });

  });

});

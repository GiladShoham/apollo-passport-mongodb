import 'regenerator-runtime/runtime';
import Mongo from 'mongodb';
const ObjectId = Mongo.ObjectId;

/** Class implementing the Apollo Passport DBDriver interface */
class MongoDbDriver {

  /**
   * Returns a DBDriver instance (for use by Apollo Passport).  Parameters are
   * driver-specific and should be clearly specificied in the README.
   * This documents the RethinkDBDash DBDriver specifically, although some
   * *options* are relevant for all drivers.
   *
   * @param {db} mongo instance, e.g. MongoClient.connect(url, function(err, db) { ... db });
   *
   * @param {string} options.userTableName    default: 'users'
   * @param {string} options.configTableName  default: 'apolloPassportConfig'
   * @param {string} options.dbName           default: current database
   */
  constructor(db, options = {}) {
    this.db = db;
    this.userTableName = options.userTableName || 'users';
    this.configTableName = options.configTableName || 'apolloPassportConfig';
    this.dbName = options.dbName;
    this.readySubs = [];

    // don't await the init, run async
    if (options.init !== false)
      this._init();
  }

  /**
   * Internal method, documented for benefit of driver authors.  Most important
   * is to call fetchConfig() (XXX unfinished), but may also assert that all
   * tables exist, and run ready callbacks.
   */
  async _init() {
    this.users = this.db.collection(this.userTableName);
    this.config = this.db.collection(this.configTableName);

    this.initted = true;

    while(this.readySubs.length)
      this.readySubs.shift().call();
  }

  /**
   * Internal method, documented for benefit of driver authors.  An awaitable
   * promise that returns if the driver is ready (or when it becomes ready).
   */
  _ready() {
    return new Promise((resolve) => {
      if (this.initted)
        resolve();
      else
        this.readySubs.push(resolve);
    });
  }

  //////////////////
  // CONFIG TABLE //
  //////////////////

  /**
   * Retrieves _all_ configuration from the database.
   * @return {object} A nested dictionary arranged by type, i.e.
   *
   * ```js
   *   {
   *     service: {          // type
   *       facebook: {       // id
   *         ...data         // value (de-JSONified if from non-document DB)
   *       }
   *     }
   *   }
   * ```
   */
  async fetchConfig() {
    await this._ready();

    const results = await this.config.find().toArray();
    const out = {};

    results.forEach(row => {
      if (!out[row.type])
        out[row.type] = {};

      out[row.type][row._id] = row;
    });

    return out;
  }

  /**
   * Creates or updates the key with the given value.
   * NoSQL databases can store the destructured value as part of the record.
   * Fixed-schema databases should JSON-encode the 'value' column.
   *
   * @param {string} type  - e.g. "service"
   * @param {string} id    - e.g. "facebook"
   * @param {object} value - e.g. { id: 1, ...profile }
   */
  async setConfigKey(type, _id, value) {
    await this._ready();
    await this.config.insertOne({ type, _id, ...value });
  }

  ///////////
  // USERS //
  ///////////

  /**
   * Given a user record, save it to the database, and return its given id.
   * NoSQL databases should store the entire object, schema-based databases
   * should honor the 'emails' and 'services' keys and store as necessary
   * in another table.
   *
   * @param {object} user
   *
   * Emails format follow this standard:
   * http://passportjs.org/docs/profile
   * {
   *   emails: [ { value: "me@me.com" } ],
   *   services: [ { facebook: { id: 1, ...profile } } ]
   *   ...anyOtherDataForUserRecordAtCreationTimeFromAppHooks
   * }
   *
   * @return {string} the id of the inserted user record
   */
  async createUser(user) {
    await this._ready();
    if (!user._id) {
      user._id = (new ObjectId).toString();
    }

    user.dateUpdated = new Date();
    user.dateAdded = new Date();
    user.dateRegistered = new Date();
    let id = user._id;

    await this.users.insertOne(user);

    return id;
  }

  async updateUser(userId, updatedUser) {
    await this._ready();
    const result = await this.users.updateOne({ _id: userId },
                              { $set: updatedUser,
                                $currentDate: {
                                  dateUpdated: true,
                                }, });
    return result.result.ok;
  }

  /**
   * Fetches a user record by id.  Schema-based databases should merge
   * appropriate user-data from e.g. `user_emails` and `user_services`.
   *
   * @param {string} id - the user record's id
   *
   * @return {object} user object in the same format expected by
   *   {@link RethinkDBDashDriver#createUser}, or *null* if none found.
   */
  async fetchUserById(userId) {
    await this._ready();
    return this.users.findOne({_id: userId});
  }

  /**
   * Given a single "email" param, returns the matching user record if one
   * exists, or null, otherwise.
   *
   * @param {string} email - the email address to search for, e.g. "me@me.com"
   *
   * @return {object} user object in the same format expected by
   *   {@link RethinkDBDashDriver#createUser}, or *null* if none found.
   */
  async fetchUserByEmail(email) {
    await this._ready();

    const results = await this.users.findOne({ 'emails.value': email});

    return results || null;
  }

  /**
   * Returns a user who has *either* a matching email address or matching
   * service record, or null, otherwise.
   *
   * @param {string} service - name of the service, e.g. "facebook"
   * @param {string} id      - id of the service record, e.g. "152356242"
   * @param {string} email   - the email address to search for, e.g. "me@me.com"
   *
   * @return {object} user object in the same format expected by
   *   {@link RethinkDBDashDriver#createUser}, or *null* if none found
   */
  async fetchUserByServiceIdOrEmail(service, id, email) {
    await this._ready();

    const results = await this.users.findOne({ $or: [{ ['services.' + service + '.id']: id }, {'emails.value': email}]});

    return results || null;
  }

  /**
   * Given a userId, set the verified field as true, and delete the verification tokens
   *
   * @param {string} userId  - the id of the user to assert
   * @param {string} verifiedField  - name of the verify field to change to true
   * @param {string} tokenField   - name of the token field to delete
   * @param {string} tokenExpirationField   - name of the token expiration field to delete
   *
   */
  async verifyUserAccount(userId, verifiedField = 'verified',
                          tokenField = 'verificationToken',
                          tokenExpirationField = 'verificationTokenExpiration') {
    await this._ready();
    const user = await this.users.findOne({ _id: userId });

    await this.users.updateOne({ _id: userId },
                              { $set: {
                                  [verifiedField]: true, },
                                $unset: {
                                  [tokenField]: '',
                                  [tokenExpirationField]: '',
                                },
                                $currentDate: {
                                  dateUpdated: true,
                                },
                              });
  }

  async addResetPasswordToken(userId, token , tokenExpiration, tokenField = 'resetPassToken',
                              tokenExpirationField = 'resetPassTokenExpiration') {

    await this.users.updateOne({
      _id: userId, }, {
        $set: {
          [tokenField]: token,
          [tokenExpirationField]: tokenExpiration,
        },

        $currentDate: {
          dateUpdated: true,
        },

        // Remove the regular verification token, because if the user reset his password
        // from the email, we are sure that this his email
        // We don't want both token to live together
        $unset: {
          verificationToken: '',
          tokenExpirationField: '',
        },
      }
    );
  }

  /**
   * Given a userId, ensures the user record contains the given email
   * address, and updates it with optional data.
   *
   * @param {string} userId  - the id of the user to assert
   * @param {string} email   - the email address to ensure exists
   * @param {object} data    - optional, e.g. { type: 'work', verified: true }
   */
  async assertUserEmailData(userId, email, data) {
    await this._ready();
    const user = await this.users.findOne({_id: userId});
    const userEmail = user.emails.find((e) => e.value === email);

    if (!userEmail) {
      const emailData = { value: email, ...data};
      await this.users.updateOne({_id: userId }, {
                                  $push: { 'emails': emailData },
                                  $currentDate: {
                                    dateUpdated: true,
                                  }, });
    }

    if (data) {
      const idx = user.emails.indexOf(userEmail);
      const emailData = { ...userEmail, ...data };
      await this.users.updateOne({ _id: userId }, {
                                  $set: { ['emails.' + idx]: emailData },
                                  $currentDate: {
                                    dateUpdated: true,
                                  }, });
    }
  }

  /**
   * Given a userId, ensure the user record contains the given service
   * record, and updates it with the given data.
   *
   * @param {string} userId  - the id of the user to assert
   * @param {string} service - the name of the service, e.g. "facebook"
   * @param {object} data    - e.g. { id: "4321", displayName: "John Sheppard" }
   */
  async assertUserServiceData(userId, service, data) {
    await this._ready();
    await this.users.updateOne({ _id: userId }, {
                                $set: { services: { [service]: { ...data } } },
                                $currentDate: {
                                  dateUpdated: true,
                                }, });
  }

  // Not sure if we need this anymore, since fetch*() functions return
  // normalized data.  But let's see.
  mapUserToServiceData(user, service) {
    return user && user.services && user.services[service];
  }
}

export default MongoDbDriver;

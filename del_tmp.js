import { MongoClient, Db, Server } from 'mongodb';

const host = process.env.MONGODB_HOST || '127.0.0.1';
const port = process.env.MONGODB_PORT || 27017;

export default async function deleteTemps() {
  const db = await MongoClient.connect(`mongodb://${host}:${port}/test`);
  const dbs = await db.admin().listDatabases();

  dbs.databases.forEach((tdb) => {
    if (tdb.name.substring(0, 3) === 'tmp') {
      
      MongoClient.connect(`mongodb://${host}:${port}/${tdb.name}`, function(err, cdb) {
        console.log('deleting ' + tdb.name);
        cdb.dropDatabase();
      });
      
    }
  })
}




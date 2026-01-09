export function loadDbFromEnv() {
  if (!process.env.DB_TYPE) {
    throw new Error('DB_TYPE is missing from environment');
  }

  if (process.env.DB_TYPE === 'firebase') {
    if (!process.env.DB_FIREBASECONFIGJSON) {
      throw new Error('DB_FIREBASECONFIGJSON is missing');
    }
    if (!process.env.DB_STORAGEURL) {
      throw new Error('DB_STORAGEURL is missing');
    }
    if (!process.env.DB_FIREBASEDBTYPE) {
      throw new Error('DB_FIREBASEDBTYPE is missing');
    }

    return {
      type: 'firebase',
      firebaseConfig: JSON.parse(
        process.env.DB_FIREBASECONFIGJSON.replace(/\\n/g, '\n')
      ),
      storageUrl: process.env.DB_STORAGEURL,
      dbType: process.env.DB_FIREBASEDBTYPE,
    };
  }

  throw new Error(`Unsupported DB_TYPE: ${process.env.DB_TYPE}`);
}

import {logger, database} from 'firebase-functions'

const config = require('../../../config')
const databaseRef = database.instance(config.DATABASE_INSTANCE)

export const onDriverDisconnected = databaseRef.ref('online_drivers/{driverId}').onDelete(async (snapshot, context) => {
  const driverId = context.params.driverId
  logger.info(`Driver ${driverId} disconnected`)
})
import {logger, database} from 'firebase-functions'
import DriverRepository from '../../repositories/DriverRepository'

const config = require('../../../config')
const databaseRef = database.instance(config.DATABASE_INSTANCE)

export const onDriverDisconnected = databaseRef.ref('online_drivers/{driverId}').onDelete(async (snapshot, context) => {
  const driverId = context.params.driverId
  
  await DriverRepository.addLastConnection(driverId).then((unixTime) => {
    logger.info(`Driver ${driverId} disconnected at ${unixTime}`)
  }).catch((e) => {
    logger.error(`Error onDriverDisconnected ${e}`)
  })
})

export const onDriverConnected = databaseRef.ref('online_drivers/{driverId}').onCreate(async (snapshot, context) => {
    const driverId = context.params.driverId
    
    await DriverRepository.addLastConnection(driverId).then((unixTime) => {
      logger.info(`Driver ${driverId} connected at ${unixTime}`)
    }).catch((e) => {
      logger.error(`Error onDriverConnected ${e}`)
    })
  })
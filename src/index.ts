import * as functions from 'firebase-functions'
import {Express} from 'express'
import * as cors from 'cors'
import * as express from 'express'
import {authRouter} from './routes/auth/controller'
import * as services from './routes/services/controller'
import {metrics, populateMetric} from './routes/metrics/controller'

const api: Express = express()
api.use(cors())
api.use('/auth', authRouter)
api.use('/metrics', metrics)

exports.api = functions.https.onRequest(api)
exports.services = services
exports.metric = populateMetric

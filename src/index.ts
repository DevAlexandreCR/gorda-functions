import * as functions from 'firebase-functions'
import {Express} from 'express'
import * as cors from 'cors'
import * as express from 'express'
import {authRouter} from './routes/auth/controller'
import * as services from './routes/services/controller'

const api: Express = express()
api.use(cors({origin: true}))
api.use('/auth', authRouter)

exports.api = functions.https.onRequest(api)
exports.services = services

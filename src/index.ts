import path from 'path'
import dotenv from 'dotenv'
import * as functions from 'firebase-functions'
import express, {Express} from 'express'
import cors from 'cors'

import {authRouter} from './routes/auth/controller'
import * as services from './routes/services/controller'
import * as drivers from './routes/drivers/controller'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dotenv.config({path: path.resolve(__dirname, '../.env'), override: true})

dayjs.extend(utc)
dayjs.extend(timezone)

const api: Express = express()
api.use(cors())
api.use('/auth', authRouter)

exports.api = functions.https.onRequest(api)
exports.services = services
exports.drivers = drivers

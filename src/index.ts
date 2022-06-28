import * as functions from 'firebase-functions'
import {Express, Request, Response} from 'express'
import {validationResult} from 'express-validator'
import FBAuth from './services/firebase/FBAuth'
import {UserType} from './services/Types/UserType'
import * as cors from 'cors'
import * as express from 'express'
import {enableValidator} from './validators/users/EnableValidator'
import {createValidator} from './validators/users/CreateValidator'

const app: Express = express()
app.use(cors({origin: true}))

app.post('/create-user', createValidator, async (req: Request, res: Response) => {
  functions.logger.info(`create user ${req.body}`, {structuredData: true})
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      data: errors.array(),
    })
  }

  await FBAuth.createUser(req.body as UserType).then((user) => {
    return res.status(200).json({
      status: 'OK',
      data: user.toJSON(),
    })
  }).catch((e) => {
    return res.status(500).json({
      status: 'FAILED',
      data: e.message,
    })
  })

  return res.end()
})

app.post('/enable-user', enableValidator, async (req: Request, res: Response) => {
  functions.logger.info(`enable user ${req.body}`, {structuredData: true})
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      data: errors.array(),
    })
  }

  await FBAuth.updateUser(req.body.uid, {disabled: req.body.disabled}).then((user) => {
    return res.status(200).json({
      status: 'OK',
      data: user.toJSON(),
    })
  }).catch((e) => {
    return res.status(500).json({
      status: 'FAILED',
      data: e.message,
    })
  })

  return res.end()
})

exports.app = functions.https.onRequest(app)

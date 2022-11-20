import {Request, Response, Router} from 'express'
import * as functions from 'firebase-functions'
import {validationResult} from 'express-validator'
import FBAuth from '../../services/firebase/FBAuth'
import {UserType} from '../../services/Types/UserType'
import {createValidator} from './validators/users/CreateValidator'
import {enableValidator} from './validators/users/EnableValidator'
import {updateEmailValidator} from './validators/users/UpdateEmailValidator'

const controller = Router()

controller.post('/create-user', createValidator, async (req: Request, res: Response) => {
  functions.logger.info(`create user ${req.body.toString()}`, {structuredData: true})
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
    functions.logger.error(`create user ${e.message}`, {structuredData: true})
    return res.status(500).json({
      status: 'FAILED',
      data: e.message,
    })
  })

  return res.end()
})

controller.post('/enable-user', enableValidator, async (req: Request, res: Response) => {
  functions.logger.info(`enable user ${req.body.uid}`, {structuredData: false})
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

controller.post('/update-email', updateEmailValidator, async (req: Request, res: Response) => {
  functions.logger.info(`update email user ${req.body.email}`, {structuredData: false})
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      data: errors.array(),
    })
  }

  await FBAuth.updateUser(req.body.uid, {email: req.body.email, emailVerified: true}).then((user) => {
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

export const authRouter = controller

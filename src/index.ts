import * as functions from 'firebase-functions'
import {UserType} from './services/Types/UserType'

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info('Hello logs!', {structuredData: true})
  response.send('Hello from Firebase!')
})

export const createUser = functions.https.onRequest((request, response) => {
  // const userData: UserType = {
  //   email: request.body.email
  // }
})

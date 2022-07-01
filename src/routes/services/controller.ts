import * as functions from 'firebase-functions'
import FBDatabase from '../../services/firebase/FBDatabase'
import {Applicant} from './Applicant'

export const assign = functions.database.ref('services/{serviceID}/applicants').onCreate(async (snapshot, context) => {
  let canceled = false
  const serviceId = context.params.serviceID
  const applicants = new Array<Applicant>()
  const refApplicants = FBDatabase.dbServices().child(serviceId).child('applicants').ref
  const refStatus = FBDatabase.dbServices().child(serviceId).child('status').ref
  const refService = FBDatabase.dbServices().child(serviceId).ref

  refApplicants.on('child_added', (dataSnapshot) => {
    const applicant = dataSnapshot.val() as Applicant
    applicant.id = dataSnapshot.key?? ''
    applicants.push(applicant)
    applicants.sort((a, b) => a.time - b.time)
  })

  refStatus.on('child_changed', (statusSnapshot) => {
    const status = statusSnapshot.val() as string
    if (status === 'canceled') {
      refApplicants.off()
      canceled = true
    }
  })

  refApplicants.on('child_removed', (dataSnapshot) => {
    const applicant = dataSnapshot.val() as Applicant
    const index = applicants.findIndex((a) => a.id === applicant.id)
    applicants.splice(index, 1)
  })

  setTimeout(() => {
    refApplicants.off()
    refService.off()
    refStatus.off()
    if (!canceled && applicants.length > 0) {
      const applicant = applicants.shift()
      refService.update({
        status: 'in_progress',
        driver_id: applicant?.id,
      }).then(() => {
        refService.off()
        console.log(`service ${serviceId} assigned to ${applicant?.id}`)
      }).catch((e) => {
        refService.off()
        console.log(`error applying service ${serviceId} to driver ${applicant?.id}`, e.message)
        console.table(applicants)
        refService.child('applicants').remove()
      })
    }
  }, 15000)
})

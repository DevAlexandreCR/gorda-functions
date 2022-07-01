import * as functions from 'firebase-functions'
import FBDatabase from '../../services/firebase/FBDatabase'
import {Applicant} from './Applicant'

export const assign = functions.database.ref('services/{serviceID}/applicants').onCreate(async (snapshot, context) => {
  const serviceId = context.params.serviceID
  const applicants = new Array<Applicant>()
  const refApplicants = FBDatabase.dbServices().child(serviceId).child('applicants').ref
  const refService = FBDatabase.dbServices().child(serviceId).ref
  refApplicants.on('child_added', (dataSnapshot) => {
    const applicant = dataSnapshot.val() as Applicant
    applicant.id = dataSnapshot.key?? ''
    applicants.push(applicant)
    applicants.sort((a, b) => a.time - b.time)
  })

  refApplicants.on('child_removed', (dataSnapshot) => {
    const applicant = dataSnapshot.val() as Applicant
    const index = applicants.findIndex((a) => a.id === applicant.id)
    applicants.splice(index, 1)
  })

  setTimeout(() => {
    refApplicants.off()
    if (applicants.length > 0) {
      const applicant = applicants.shift()
      refService.update({
        status: 'in_progress',
        driver_id: applicant?.id,
      }).then(() => {
        console.log(`service ${serviceId} assigned to ${applicant?.id}`)
      }).catch((e) => {
        console.log(`error applying service ${serviceId} to driver ${applicant?.id}`, e.message)
        console.table(applicants)
        refService.child('applicants').remove()
      })
    }
  }, 15000)
})

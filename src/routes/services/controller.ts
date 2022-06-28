import * as functions from 'firebase-functions'
import FBDatabase from '../../services/firebase/FBDatabase'
import {Applicant} from './Applicant'

export const assign = functions.database.ref('services/{serviceID}/applicants').onCreate(async (snapshot, context) => {
  const serviceId = context.params.serviceID
  const refApplicants = FBDatabase.dbServices().child(serviceId).child('applicants').ref
  const refService = FBDatabase.dbServices().child(serviceId).ref
  let assignedId: string | null = snapshot.key
  let lastApplicant: Applicant
  refApplicants.on('child_added', (dataSnapshot) => {
    const applicant = dataSnapshot.val() as Applicant
    const applicantId = dataSnapshot.key
    if (lastApplicant) {
      if (applicant.time < lastApplicant.time) {
        lastApplicant = applicant
        assignedId = applicantId
      }
    } else {
      lastApplicant = applicant
    }
  })
  await setTimeout(() => {
    console.log('assigned to ' + assignedId)
    refApplicants.off()
    return refService.update({
      status: 'in_progress',
      driver_id: assignedId,
    })
  }, 15000)
})

import {WriteResult} from 'firebase-admin/lib/firestore'
import FBFirestore from '../services/firebase/FBFirestore'
import {QuerySnapshot} from 'firebase-admin/firestore'
import {Metric} from '../Types/Metric'
import {MetricType} from '../Types/MetricType'
import ServiceRepository from './ServiceRepository'
import {ServiceStatus} from '../Types/ServiceStatus'
import * as dayjs from 'dayjs'

class MetricRepository {
  async saveMetric(metric: Metric): Promise<WriteResult> {
    await FBFirestore.dbMetrics()
        .where('date', '==', metric.date)
        .where('type', '==', metric.type)
        .where('status', '==', metric.status)
        .get()
        .then((snapshot) => {
          snapshot.forEach( (doc) => {
            doc.ref.delete()
          })
        })
    return await FBFirestore.dbMetrics().doc().set(metric)
  }

  async getGlobalMetric(startDate: string, endDate: string): Promise<QuerySnapshot> {
    return FBFirestore.dbMetrics()
        .orderBy('date')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .where('type', '==', MetricType.Global)
        .get()
  }

  async populateMetric(startDate: number, endDate: number): Promise<void> {
    return new Promise((res, rej) => {
      ServiceRepository.getGlobalMetric(startDate, endDate, ServiceStatus.Canceled)
          .then((canceled) => {
            ServiceRepository.getGlobalMetric(startDate, endDate, ServiceStatus.Terminated)
                .then((terminated) => {
                  const today = dayjs(startDate * 1000).format('YYYY-MM-DD').toString()
                  const metricCanceled: Metric = {
                    date: today,
                    type: MetricType.Global,
                    status: ServiceStatus.Canceled,
                    count: canceled.data().count ?? 0,
                  }

                  const metricTerminated: Metric = {
                    date: today,
                    type: MetricType.Global,
                    status: ServiceStatus.Terminated,
                    count: terminated.data().count ?? 0,
                  }

                  this.saveMetric(metricCanceled).catch((e) => {
                    rej(e)
                  })
                  this.saveMetric(metricTerminated).catch((e) => {
                    rej(e)
                  })
                  res()
                })
          }).catch((e) => {
            rej(e)
          })
    })
  }
}

export default new MetricRepository()

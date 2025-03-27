import {DriverPaymentMode} from './DriverPaymentMode'

export type DriverType = {
    id: string
    name: string
    email: string
    password: string|null
    phone: string
    phone2: string|null
    docType: string
    paymentMode: DriverPaymentMode
    document: string
    photoUrl: string|null
    vehicle: null
    device: null
    balance: number
    enabled_at: number
    created_at: number
}

import {DriverPaymentMode} from './DriverPaymentMode'
import {DriverAvailabilityType} from './DriverAvailabilityType'

export type DriverVehicleEntry = {
    id: string
    plate: string
    brand?: string | null
    model?: string | null
    is_selectable: boolean
    is_selected: boolean
}

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
    device: null
    balance: number
    enabled_at: number
    created_at: number
    selected_vehicle?: DriverVehicleEntry | null
    roster?: DriverVehicleEntry[] | null
    availability?: DriverAvailabilityType
}

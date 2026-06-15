import {LocationType} from './LocationType'
import {Metadata} from './Metadata'

export type ServiceType = {
  id: string
  status: string
  start_loc: LocationType
  end_loc: LocationType | null
  phone: string
  name: string
  comment: string | null
  amount: number | null
  metadata: Metadata | null
  driver_id: string | null
  client_id: string | null
  created_at: number
}

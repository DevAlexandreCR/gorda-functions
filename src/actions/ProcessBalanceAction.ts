import DriverRepository from "../repositories/DriverRepository";
import ServiceRepository from "../repositories/ServiceRepository";
import SettingsRepository from "../repositories/SettingsRepository";
import { City } from "../Types/City";
import { DriverPaymentMode } from "../Types/DriverPaymentMode";

export class ProcessBalanceAction {
    private serviceID: string

    constructor(serviceID: string) {
        this.serviceID = serviceID
    }

    async execute(): Promise<void> {
        const service = await ServiceRepository.getServiceDB(this.serviceID)
        if (service.driver_id) {
            const driver = await DriverRepository.getDriver(service.driver_id)
            if (driver.paymentMode === DriverPaymentMode.PERCENTAGE && service.metadata?.trip_fee) {
                const city = await this.getCity(service.start_loc.country, service.start_loc.city)
                const discount = (service.metadata.trip_fee * city.percentage) / 100
                driver.balance -= discount
                await DriverRepository.saveBalance(driver.id, driver.balance)
            }
        }
    }

    private async getCity(branchID: string, cityID: string): Promise<City> {
        return SettingsRepository.getCitySettings(branchID, cityID)
    }
}
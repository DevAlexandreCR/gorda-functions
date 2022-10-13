import {Message, Messaging} from 'firebase-admin/messaging'
import Admin from './Admin'

class FBMessaging {
  public msg: Messaging

  constructor() {
    this.msg = Admin.getInstance().msg
  }

  public async sendService(payload: Message, dryRun = false): Promise<string> {
    return this.msg.send(payload, dryRun)
  }
}

export default new FBMessaging()

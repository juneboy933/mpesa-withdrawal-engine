import { Injectable } from '@nestjs/common';

@Injectable()
export class MpesaService {
  initiateB2C(Param: any): Promise<{ ConversationID: string }> {
    // Placeholder — replaced in next step with real Safaricom API call
    console.log(Param);

    throw new Error('MpesaService.initiateB2C not yet implemented');
  }
}

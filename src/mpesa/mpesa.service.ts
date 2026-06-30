import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { B2CRequestParam, B2CResponse } from './interfaces/mpesa-interface';
import { MpesaCallbackPayload } from './dto/mpesa-callback.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { WithdrawalsService } from 'src/withdrawals/withdrawals.service';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly withdraw: WithdrawalsService,
  ) {}

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && now < this.tokenExpiresAt) {
      this.logger.debug('Using cached M-Pesa acess token');
      return this.cachedToken;
    }

    const tokenUrl = this.config.get<string>('MPESA_TOKEN_URL');
    const consumerkey = this.config.get<string>('MPESA_CONSUMER_KEY');
    const secretkey = this.config.get<string>('MPESA_CONSUMER_SECRET');

    const auth = Buffer.from(`${consumerkey}:${secretkey}`).toString('base64');

    try {
      const response = await axios.get<{
        access_token: string;
        expires_in: string;
      }>(tokenUrl!, {
        headers: {
          Authorization: `Basic ${auth}`,
          'User-Agent': 'm-pesa-withdrawal-engine.1.0',
        },
        timeout: 15000,
      });

      this.cachedToken = response.data.access_token;
      const expiresIn = parseInt(response.data.expires_in ?? '3599', 10);
      this.tokenExpiresAt = now + (expiresIn - 60) * 1000;

      return this.cachedToken;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Failed to get M-Pesa access token: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        this.logger.error(`Failed to get M-Pesa access token: ${error}`);
      }
      throw new HttpException('Failed to authenticate with M-Pesa', 502);
    }
  }

  async initiateB2C(Param: B2CRequestParam): Promise<B2CResponse> {
    const token = await this.getAccessToken();
    const B2CUrl = this.config.get<string>('MPESA_B2C_URL');
    const shortCode = this.config.get<string>('MPESA_SHORTCODE');
    const initiatorName = this.config.get<string>('MPESA_INITIATOR_NAME');
    const securityCredential = this.config.get<string>(
      'MPESA_SECURITY_CREDENTIAL',
    );
    const callbackUrl = this.config.get<string>('MPESA_CALLBACK_URL');

    const formattedPhone = Param.phoneNumber.replace('+', '');

    const payload = {
      OriginatorConversationID: Param.idempotencyKey,
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: Param.amount,
      PartyA: shortCode,
      PartyB: formattedPhone,
      Remarks: `Withdrawal ${Param.transactionId}`,
      QueueTimeOutURL: callbackUrl,
      ResultURL: callbackUrl,
      Occasion: Param.idempotencyKey,
    };

    try {
      const response = await axios.post<B2CResponse>(B2CUrl!, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      this.logger.log(
        `B2C request sent — transaction ${Param.transactionId}, ConversationID: ${response.data.ConversationID}`,
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `B2C request failed — transaction ${Param.transactionId}: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        this.logger.error(
          `B2C request failed — transaction ${Param.transactionId}: ${error}`,
        );
      }
      throw new Error(`M-Pesa B2C request failed: ${error}`);
    }
  }

  private verifyCallbackStructure(payload: MpesaCallbackPayload): boolean {
    return !!(
      payload &&
      payload.Result &&
      typeof payload.Result.ResultCode === 'number' &&
      payload.Result.ConversationID
    );
  }

  async handleCallback(payload: MpesaCallbackPayload) {
    this.logger.log(`MPesa callback received: ${JSON.stringify(payload)}`);

    if (!this.verifyCallbackStructure(payload)) {
      this.logger.warn('Malformed M-Pesa callback received — ignoring');
      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    const { ResultCode, ConversationID, TransactionID, ResultDesc } =
      payload.Result;

    const transaction = await this.prisma.transaction.findUnique({
      where: { mpesa_conversation_id: ConversationID },
    });

    if (!transaction) {
      this.logger.warn(
        `No transaction found for ConversationID: ${ConversationID}`,
      );

      return { ResultCode: 0, ResultDesc: 'Accepted' };
    }

    if (ResultCode === 0) {
      await this.withdraw.markCompleted(
        transaction.id,
        TransactionID ?? 'UNKNOWN',
        ConversationID,
      );
    } else {
      await this.withdraw.markFailed(transaction.id, ResultDesc);
    }

    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}

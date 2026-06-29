export interface PayloadInterface {
  transactionId: string;
  accountId: string;
  amount: string;
  phoneNumber: string;
  idempotencyKey: string;
}

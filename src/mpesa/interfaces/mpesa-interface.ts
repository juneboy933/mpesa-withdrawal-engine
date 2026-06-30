export interface B2CRequestParam {
  transactionId: string;
  phoneNumber: string;
  amount: string;
  idempotencyKey: string;
}

export interface B2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDesription: string;
}

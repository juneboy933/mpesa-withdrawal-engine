import * as Joi from 'joi';

export const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  //   MPESA CREDENTIALS
  MPESA_CONSUMER_KEY: Joi.string().required(),
  MPESA_CONSUMER_SECRET: Joi.string().required(),
  MPESA_TOKEN_URL: Joi.string().required(),
  MPESA_B2C_URL: Joi.string().required(),
  MPESA_INITIATOR_NAME: Joi.string().required(),
  MPESA_SECURITY_CREDENTIAL: Joi.string().required(),
  MPESA_SHORTCODE: Joi.string().required(),
  MPESA_CALLBACK_URL: Joi.string().required(),

  API_KEY_SECRET: Joi.string().required(),
});

import Joi from 'joi';

export const envValidation = Joi.object({
    PORT: Joi.number().default(3000),
    JWT_TOKEN_SECRET: Joi.string().required(),
    JWT_TOKEN_EXPIRATION: Joi.string().required()
})
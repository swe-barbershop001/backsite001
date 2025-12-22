import Joi from 'joi';

export const envValidation = Joi.object({
    PORT: Joi.number().default(3000),
    JWT_TOKEN_SECRET: Joi.string().required(),
    JWT_TOKEN_EXPIRATION: Joi.string().required(),
    // SUPER_ADMIN Configuration (optional)
    SUPER_ADMIN_USERNAME: Joi.string().required(),
    SUPER_ADMIN_PASSWORD: Joi.string().required(),
    SUPER_ADMIN_NAME: Joi.string().optional(),
    SUPER_ADMIN_PHONE: Joi.string().optional(),
})
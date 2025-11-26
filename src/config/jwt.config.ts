import { ConfigType, registerAs } from "@nestjs/config";

export const jwtConfig = registerAs("jwt", ()=>({
    tokenSecret: process.env.JWT_TOKEN_SECRET!,
    tokenExpiration: process.env.JWT_TOKEN_EXPIRATION!,
}))

export type JwtConfigType = ConfigType<typeof jwtConfig>

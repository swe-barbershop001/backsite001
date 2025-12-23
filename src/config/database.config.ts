import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const dbSynchronize = configService.get<string>('DB_SYNCHRONIZE');
  const isProduction = nodeEnv === 'production';
  
  // DB_SYNCHRONIZE environment variable bo'lsa, uni ishlat, aks holda NODE_ENV ga qarab
  let synchronize: boolean;
  if (dbSynchronize !== undefined) {
    synchronize = dbSynchronize === 'true';
  } else {
    // Production'da synchronize ni o'chirish (xavfsizlik uchun)
    synchronize = !isProduction;
  }
  
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_DATABASE', 'barbershop'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    synchronize: synchronize,
    // Production'da migration'larni avtomatik ishga tushirish
    migrationsRun: isProduction,
    logging: nodeEnv === 'development',
  };
};

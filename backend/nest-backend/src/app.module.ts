import {MiddlewareConsumer, Module, RequestMethod} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import {LoggerMiddleware} from "./middlewear/middlewear.logger";
import { AdminModule } from './admin/admin.module';
import { User } from './user/dto/user.dto';

@Module({
  imports: [
      ConfigModule.forRoot({
    isGlobal: true,   // makes config available everywhere
  }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'insure-db',
        entities: [User],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
      UserModule,
      AuthModule,
      ChatModule,
      AdminModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService,AuthService],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggerMiddleware)
            //TODO change paths to only apply to specific routes
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}

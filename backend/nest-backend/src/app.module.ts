import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import {UserService} from "./user/user.service";
import { MiddlewearModule } from './middlewear/middlewear.module';

@Module({
  imports: [
      ConfigModule.forRoot({
    isGlobal: true,   // makes config available everywhere
  }),
      UserModule,
      AuthModule,
      ChatModule,
      MiddlewearModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService,AuthService,UserService],
})
export class AppModule {
}

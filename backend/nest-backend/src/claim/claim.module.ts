import { Module } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { ClaimController } from './claim.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "../user/dto/user.dto";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [ClaimService],
  controllers: [ClaimController]
})
export class ClaimModule {}

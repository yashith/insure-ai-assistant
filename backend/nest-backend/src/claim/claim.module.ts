import { Module } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { ClaimController } from './claim.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "../user/dto/user.dto";
import {Policy} from "../policy/dto/policy.dto";

@Module({
  imports: [TypeOrmModule.forFeature([User,Policy])],
  providers: [ClaimService],
  controllers: [ClaimController]
})
export class ClaimModule {}

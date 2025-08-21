import { Module } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { ClaimController } from './claim.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "../user/dto/user.dto";
import {Policy} from "../policy/dto/policy.dto";
import {Claim} from "./dto/calim.dto";

@Module({
  imports: [TypeOrmModule.forFeature([Policy,Claim])],
  providers: [ClaimService],
  controllers: [ClaimController]
})
export class ClaimModule {}

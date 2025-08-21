import {BadRequestException, Injectable} from '@nestjs/common';
import {DataSource, Repository} from "typeorm";
import {Claim} from "./dto/calim.dto";
import {ClaimSubmitRequest} from "./dto/claim.submit.req";
import {Policy} from "../policy/dto/policy.dto";
import {InjectRepository} from "@nestjs/typeorm";

@Injectable()
export class ClaimService {
    constructor(
        @InjectRepository(Policy)
        private readonly policyRepository: Repository<Policy>,
        @InjectRepository(Claim)
        private readonly claimRepository: Repository<Claim>
    ) {}
    async findOneById(id: number, userId: number): Promise<Claim| undefined> {
        const claim = await this.claimRepository.findOne({
            where: {id, userId}
        });
        return claim ?? undefined;
    }

    async findUserClaims(userId: number): Promise<Claim[]> {
        const claims = await this.claimRepository.find({
            where: {userId}
        });
        return claims ?? [];
    }

    async submitClaim(claim: ClaimSubmitRequest, userId: number): Promise<Claim|BadRequestException> {

        const policy  = await this.policyRepository.findOne({
            where: { userId: userId , id: claim.policyNumber},
        })
        if (!policy) {
            throw new BadRequestException("Policy not found for the user from the policy number provided");
        }
        const newClaim = this.claimRepository.create({
            userId,
            status: 'Pending',
            vehicle: claim.vehicle,
            damage: claim.damage
        });
        let createdClaim= await this.claimRepository.save(newClaim);
        //Agent mistakes it as an existing claim if status returns as pending
        createdClaim.status = 'created';
        return  createdClaim
    }
}



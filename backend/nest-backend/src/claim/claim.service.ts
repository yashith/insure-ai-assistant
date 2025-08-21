import {BadRequestException, Injectable} from '@nestjs/common';
import {DataSource} from "typeorm";
import {User} from "../user/dto/user.dto";
import {Claim} from "./dto/calim.dto";
import {ClaimSubmitRequest} from "./dto/claim.submit.req";
import {Policy} from "../policy/dto/policy.dto";

@Injectable()
export class ClaimService {
    constructor(
        private dataSource: DataSource
    ) {}
    async findOneById(id: number, userId: number): Promise<Claim| undefined> {
        const claimRepository = this.dataSource.getRepository(Claim);
        const claim = await claimRepository.findOne({
            where: {id, userId}
        });
        return claim ?? undefined;
    }

    async findUserClaims(userId: number): Promise<Claim[]> {
        const claimRepository = this.dataSource.getRepository(Claim);
        const claims = await claimRepository.find({
            where: {userId}
        });
        return claims ?? [];
    }

    async submitClaim(claim: ClaimSubmitRequest, userId: number): Promise<Claim|BadRequestException> {
        const claimRepository = this.dataSource.getRepository(Claim);
        const policyRepository= this.dataSource.getRepository(Policy);

        const policy  = await policyRepository.findOne({
            where: { userId: userId , id: claim.policyNumber},
        })
        if (!policy) {
            throw new BadRequestException("Policy not found for the user from the policy number provided");
        }
        const newClaim = claimRepository.create({
            userId,
            status: 'Pending',
            vehicle: claim.vehicle,
            damage: claim.damage
        });
        let createdClaim= await claimRepository.save(newClaim);
        //Agent mistakes it as an existing claim if status returns as pending
        createdClaim.status = 'created';
        return  createdClaim
    }
}



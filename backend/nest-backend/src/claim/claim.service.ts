import { Injectable } from '@nestjs/common';
import {DataSource} from "typeorm";
import {User} from "../user/dto/user.dto";
import {Claim} from "./dto/calim.dto";

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
}



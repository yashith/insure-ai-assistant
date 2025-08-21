import {BadRequestException, Injectable} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './dto/policy.dto';

@Injectable()
export class PolicyService {
    constructor(
        @InjectRepository(Policy)
        private policyRepository: Repository<Policy>
    ) {}

    async findOneById(id: number): Promise<Policy | Error> {
        const policy = await this.policyRepository.findOne({
            where: { id },
            relations: ['user']
        });
        if(policy!= null){
            return policy;
        } else{
            return new Error("Policy not found");
        }
    }

    async findUserPolicyByUserId(userId: number): Promise<Policy|BadRequestException> {
        const policy = await this.policyRepository.findOne({
            where: { userId },
            relations: ['user']
        });
        if (!policy) {
            return new BadRequestException("Policy not found for the user");
        }
        return policy
    }
}

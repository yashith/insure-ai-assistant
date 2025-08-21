import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../common/constants/roles.const';
import { Policy } from './dto/policy.dto';
import { PolicyService } from './policy.service';

@ApiTags('Policy')
@Controller('api/policy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PolicyController {
    constructor(
        private readonly policyService: PolicyService
    ) {}

    @Get('user')
    @Roles(Role.USER, Role.ADMIN)
    @ApiOperation({ summary: 'Get user policy by user ID' })
    @ApiOkResponse({ type: Policy, description: 'Successfully retrieved user policy' })
    async findUserPolicyByUserId(@Request() req): Promise<Policy | BadRequestException> {
        return await this.policyService.findUserPolicyByUserId(req.userId);
    }
}

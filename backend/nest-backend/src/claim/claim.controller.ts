import {BadRequestException, Body, Controller, Post, UseGuards, Request, Get} from '@nestjs/common';
import {RegisterRequestDto} from "../auth/dto/register.req.dto";
import {GenericResponse} from "../auth/dto/generic.res.dto";
import {ClaimByIdRequest} from "./dto/claim.req.dto";
import {ClaimService} from "./claim.service";
import {Claim} from "./dto/calim.dto";
import {JwtAuthGuard} from "../common/guards/jwt-auth.guard";
import {ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiOkResponse} from '@nestjs/swagger';
import {ClaimStatusResponseDto} from "./dto/claim.status.response.dto";
import {ClaimSubmitRequest} from "./dto/claim.submit.req";
import {Roles} from "../common/decorators/role.decorator";
import {Role} from "../common/constants/roles.const";

@Controller('claim')
export class ClaimController {
    constructor(private claimService: ClaimService) {}
    @Post('claim-status')
    @UseGuards(JwtAuthGuard) // protect with auth
    @Roles(Role.USER,Role.ADMIN)
    @ApiOkResponse({ type: ClaimStatusResponseDto, description: 'Successfully retrieved user', isArray: false})
    async claimStatus(@Body() claim: ClaimByIdRequest, @Request() req): Promise<ClaimStatusResponseDto | BadRequestException> {
        const userId = req.user.id; // Extract userId from JWT token
        let claimResponse = await this.claimService.findOneById(claim.claim_id, userId);

        if (claimResponse === undefined) {
            return new BadRequestException("Claim not found");
        }
        return new ClaimStatusResponseDto(claimResponse.status,claimResponse.id,claimResponse.updatedAt);

    }

    @Get('claims')
    @UseGuards(JwtAuthGuard) // protect with auth
    @Roles(Role.USER,Role.ADMIN)
    @ApiOkResponse({ type: Claim , description: 'Successfully retrieved user', isArray: true })
    async userClaims( @Request() req):Promise<Claim[]> {
        const userId = req.user.id; // Extract userId from JWT token
        return await this.claimService.findUserClaims(userId);
    }

    @Post('create-claim')
    @UseGuards(JwtAuthGuard) // protect with auth
    @ApiOkResponse({ type: ClaimStatusResponseDto, description: 'Successfully retrieved user', isArray: false})
    async createClaim(@Body() claim: ClaimSubmitRequest, @Request() req): Promise<ClaimStatusResponseDto | BadRequestException> {
        const userId = req.user.id; // Extract userId from JWT token
        let claimResponse = await this.claimService.submitClaim(claim, userId);

        if (claimResponse === undefined) {
            return new BadRequestException("Could not create a claim");
        }
        return new ClaimStatusResponseDto(claimResponse.status,claimResponse.id,claimResponse.updatedAt);

    }
}

import {BadRequestException, Body, Controller, Post, UseGuards, Request, Get} from '@nestjs/common';
import {RegisterRequestDto} from "../auth/dto/register.req.dto";
import {GenericResponse} from "../auth/dto/generic.res.dto";
import {ClaimByIdRequest} from "./dto/claim.req.dto";
import {ClaimService} from "./claim.service";
import {Claim} from "./dto/calim.dto";
import {JwtAuthGuard} from "../common/guards/jwt-auth.guard";

@Controller('claim')
export class ClaimController {
    constructor(private claimService: ClaimService) {}
    @Post('claim-status')
    @UseGuards(JwtAuthGuard) // protect with auth
    async claimStatus(@Body() claim: ClaimByIdRequest, @Request() req){
        const userId = req.user.id; // Extract userId from JWT token
        let claimResponse = await this.claimService.findOneById(claim.claim_id, userId);

        if (claimResponse === undefined) {
            return new BadRequestException("Claim not found");
        }
        return {
            "id": claimResponse.id,
            "status": claimResponse.status,
            "updatedAt": claimResponse.updatedAt,
        }

    }

    @Get('claims')
    @UseGuards(JwtAuthGuard) // protect with auth
    async userClaims( @Request() req){
        const userId = req.user.id; // Extract userId from JWT token
        return await this.claimService.findUserClaims(userId);
    }
}

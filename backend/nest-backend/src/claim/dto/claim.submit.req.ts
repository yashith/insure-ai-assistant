import {ApiProperty} from "@nestjs/swagger";
import {IsNumber, IsString} from "class-validator";

export  class ClaimSubmitRequest{
    @ApiProperty()
    @IsNumber()
    policyNumber: number;

    @ApiProperty()
    @IsString()
    vehicle: string;

    @ApiProperty()
    @IsString()
    damage: string;
}
import {ApiProperty} from "@nestjs/swagger";
import {IsNumber, IsString} from "class-validator";

export class ClaimByIdRequest {

    @ApiProperty({
        "example": "1",
    })
    @IsNumber()
    claim_id:number
}
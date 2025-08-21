import {ApiProperty} from "@nestjs/swagger";

export class ClaimStatusResponseDto {
    @ApiProperty()
    claimId: number;
    @ApiProperty()
    status: string;
    @ApiProperty()
    updatedAt: Date;

    constructor(status: string, id: number, updatedAt: Date) {
        this.claimId = id ;
        this.status= status;
        this.updatedAt = updatedAt;
    }
}
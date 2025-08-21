import {ApiProperty} from "@nestjs/swagger";

export class ClaimStatusResponseDto {
    @ApiProperty()
    id: number;
    @ApiProperty()
    status: string;
    @ApiProperty()
    updatedAt: Date;

    constructor(status: string, id: number, updatedAt: Date) {
        this.id = id ;
        this.status= status;
        this.updatedAt = updatedAt;
    }
}
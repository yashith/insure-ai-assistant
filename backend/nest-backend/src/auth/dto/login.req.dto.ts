import {ApiProperty} from "@nestjs/swagger";
import {IsString} from "class-validator";
export class LoginRequestDto {
    @ApiProperty({
        "example": "john_doe",
    })
    @IsString()
    username: string;

    @ApiProperty({
        "example": "password123",
    })
    @IsString()
    password:string;
}

import { IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class ChatDto {
    @ApiProperty()
    @IsString()
    message: string;
}

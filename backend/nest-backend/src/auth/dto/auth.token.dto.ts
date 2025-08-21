import {ApiProperty} from "@nestjs/swagger";

export class AccessToken  {
    @ApiProperty()
    access_token: string;
}
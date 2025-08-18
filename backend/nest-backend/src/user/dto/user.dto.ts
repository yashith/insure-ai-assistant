import { IsString } from 'class-validator';

export class User{
    id: number;
    @IsString()
    username: string;
    @IsString()
    password: string;
    @IsString()
    role: string;
}

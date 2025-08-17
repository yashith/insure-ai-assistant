import {BadRequestException, Injectable} from '@nestjs/common';
import {JwtService} from "@nestjs/jwt";
import {User, UserService} from "../user/user.service";
import * as bcrypt from 'bcrypt';
import {ApiProperty} from "@nestjs/swagger";
//TODO move these
export type AccessToken = {
    access_token: string;
}

export class  RegisterRequestDto {
    @ApiProperty({
        "example": "john_doe",
    })
    username: string;
    @ApiProperty({
        "example": "password123",
    })
    password: string;
}
export class LoginRequestDto {
    @ApiProperty({
        "example": "john_doe",
    })
    username: string;
    @ApiProperty({
        "example": "password123",
    })
    password:string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}
    async validateUser(username: string, password: string): Promise<User> {
        const user: User | undefined = await this.userService.findOne(username);
        if (!user) {
            throw new BadRequestException('User not found');
        }
        const isMatch: boolean = bcrypt.compareSync(username+password, user.password);
        if (!isMatch) {
            throw new BadRequestException('Password does not match');
        }
        return user;
    }
    async login(user:LoginRequestDto): Promise<AccessToken> {
        const payload = { username: user.username, password: user.password};
        const existingUser = await this.userService.findOne(user.username);
        if (existingUser) {
            const inputPass = user.username+user.password;
            const isMatch: boolean = bcrypt.compareSync(inputPass, existingUser.password);

            if(!isMatch){
                throw new BadRequestException('Password does not match');
            }
            return { access_token: this.jwtService.sign(payload) };
        }
        else{
            throw new BadRequestException('User not found');
        }
    }
    async register(user: RegisterRequestDto): Promise<AccessToken> {
        const existingUser = await this.userService.findOne(user.username);
        if (existingUser) {
            throw new BadRequestException('email already exists');
        }
        const hashedPassword = await bcrypt.hash(user.username+user.password, 10);
        const newUser: { password: string; username: string } = { ...user, password: hashedPassword };
        await this.userService.create(newUser);
        return this.login(user);
    }
}

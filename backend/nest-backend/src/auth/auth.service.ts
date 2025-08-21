import {BadRequestException, Injectable} from '@nestjs/common';
import {JwtService} from "@nestjs/jwt";
import {UserService} from "../user/user.service";
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {User} from "../user/dto/user.dto";
import {LoginRequestDto} from "./dto/login.req.dto";
import {RegisterRequestDto} from "./dto/register.req.dto";
import {AccessToken} from "./dto/auth.token.dto";
import {GenericResponse} from "./dto/generic.res.dto";

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}
    async validateUser(id:number,username: string, role: string): Promise<User> {
        const user: User | undefined = await this.userService.findOneByUsername(username);
        if (!user) {
            throw new BadRequestException('User not found');
        }
        const isMatch: boolean = user.id === id && user.username === username && user.role === role;
        if (!isMatch) {
            throw new BadRequestException('Invalid token');
        }
        return user;
    }
    async login(user:LoginRequestDto): Promise<AccessToken> {
        const existingUser = await this.userService.findOneByUsername(user.username);
        if (existingUser) {
            const inputPass = user.username+user.password;
            const isMatch: boolean = bcrypt.compareSync(inputPass, existingUser.password);

            if(!isMatch){
                throw new BadRequestException('Password does not match');
            }
            const sessionId = uuidv4();
            const payload = {
                userId: existingUser.id,
                username: existingUser.username, 
                role: existingUser.role,
                sessionId: sessionId
            };
            return { access_token: this.jwtService.sign(payload) };
        }
        else{
            throw new BadRequestException('User not found');
        }
    }
    async register(user: RegisterRequestDto):Promise<GenericResponse> {
        const existingUser = await this.userService.findOneByUsername(user.username);
        if (existingUser) {
            throw new BadRequestException('Username already exists');
        }
        const hashedPassword = await bcrypt.hash(user.username+user.password, 10);
        const newUser: { password: string; username: string } = { ...user, password: hashedPassword };
        await this.userService.create(newUser);

        return {
            message: 'User registered successfully',
        };
    }
}

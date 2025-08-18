import {BadRequestException, Body, Controller, Post} from '@nestjs/common';
import {AuthService} from "./auth.service";
import {LoginRequestDto} from "./dto/login.req.dto";
import {RegisterRequestDto} from "./dto/register.req.dto";
import {AccessToken} from "./dto/auth.token.dto";

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}
    // @UseGuards(AuthGuard('local'))
    @Post('login')
    async login(@Body() req:LoginRequestDto): Promise<AccessToken| BadRequestException> {
        return this.authService.login(req);
    }
    @Post('register')
    async register( @Body() registerBody: RegisterRequestDto): Promise<AccessToken| BadRequestException> {
        return await this.authService.register(registerBody);
    }
}


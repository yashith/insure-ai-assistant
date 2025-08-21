import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from '@nestjs/config';
import {AuthService} from "./auth.service";
import * as console from "console";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService, private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret',
        });
    }
    async validate(payload:any):Promise<any>{
        const user = await this.authService.validateUser(payload.userId,payload.username,payload.role);
        if (!user) {
            throw new UnauthorizedException();
        }
        // Add sessionId to the user object for access in controllers
        return { ...user, sessionId: payload.sessionId };
    }

}
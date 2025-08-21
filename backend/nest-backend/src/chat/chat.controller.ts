import {Controller, Get, Post, Body, UseGuards, Req} from '@nestjs/common';
import { ChatService } from './chat.service';
import {JwtAuthGuard} from "../common/guards/jwt-auth.guard";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/role.decorator";
import {Role} from "../common/constants/roles.const";
import {ChatDto} from "./dto/chat.dto";

@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(Role.USER, Role.ADMIN)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

/*  @Get()
  getMessages() {
    return this.chatService.getMessages();
  }*/

  @UseGuards(JwtAuthGuard) // protect with auth
  @Roles(Role.USER,Role.ADMIN)
  @Post()
  async chat(@Body() chatDto: ChatDto, @Req() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const sessionId = req.user.sessionId;
    return this.chatService.sendMessage(chatDto.message, req.user, token, sessionId);
  }
}
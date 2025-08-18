import {Controller, Get, Post, Body, UseGuards} from '@nestjs/common';
import { ChatService } from './chat.service';
import {JwtAuthGuard} from "../auth/common/guards/jwt-auth.guard";
import {RolesGuard} from "../auth/common/guards/roles.guard";
import {Roles} from "../auth/common/decorators/role.decorator";
import {Role} from "../auth/common/constants/roles.const";

@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(Role.USER, Role.ADMIN)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getMessages() {
    return this.chatService.getMessages();
  }

  @Post()
  sendMessage(@Body() message: { sender: string; content: string }) {
    return this.chatService.sendMessage(message);
  }
}
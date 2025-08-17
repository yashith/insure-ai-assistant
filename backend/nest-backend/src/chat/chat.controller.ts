import {Controller, Get, Post, Body, UseGuards} from '@nestjs/common';
import { ChatService } from './chat.service';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
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
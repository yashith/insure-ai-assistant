import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  private messages: { sender: string; content: string }[] = [];

  getMessages() {
    return this.messages;
  }

  sendMessage(message: { sender: string; content: string }) {
    this.messages.push(message);
    return { success: true, message: 'Message sent successfully' };
  }
}
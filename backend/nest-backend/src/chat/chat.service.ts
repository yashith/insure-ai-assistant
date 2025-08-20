import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import axios from "axios";
import {User} from "../user/dto/user.dto";

@Injectable()
export class ChatService {
  private readonly messages: { sender: string; content: string }[] = [];
  private readonly aiServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000') + '/chat';
  }
  getMessages() {
    return this.messages;
  }

  async sendMessage(message: string, user: User) {
    try {
      const response = await axios.post(this.aiServiceUrl, {
        userId: user.id.toString(),
        role: user.role,
        message:message,
      });

      return response.data; // return AI response to controller
    } catch (error) {
      //TODO check whether error handling needed
      console.error('AI Service Error:', error.message);
      throw new HttpException(
          'AI service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
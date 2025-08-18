import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import axios from "axios";
import {User} from "../user/dto/user.dto";

@Injectable()
export class ChatService {
  private messages: { sender: string; content: string }[] = [];
  private aiServiceUrl = "https://webhook.site/d0e1615f-2328-43be-80ad-58549ce44ed2"; //TODO fetch this from config holder
  getMessages() {
    return this.messages;
  }

  async sendMessage(message: string, user: User) {
    try {
      const response = await axios.post(this.aiServiceUrl, {
        userId: user.id,
        role: user.role,
        message,
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
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";
import axios from "axios";
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class AdminService {
    private readonly aiServiceUrl: string;

    constructor(private configService: ConfigService) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
    }

    async uploadDocument(file: Express.Multer.File, description?: string) {
        try {
            // Ensure uploads directory exists
            await this.ensureUploadsDirectory();

            // Process the uploaded file (you can extend this to send to AI service)
            const fileInfo = {
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype,
                description: description || '',
                uploadedAt: new Date().toISOString(),
            };

            // Optional: Send file info to AI service for processing
            await this.sendToAiService(fileInfo);

            return {
                message: 'Document uploaded successfully',
                file: fileInfo,
            };
        } catch (error) {
            console.error('Document upload error:', error.message);
            throw new HttpException(
                'Failed to upload document',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }


    private async ensureUploadsDirectory() {
        const uploadsPath = join(process.cwd(), 'uploads', 'documents');
        try {
            await fs.access(uploadsPath);
        } catch {
            await fs.mkdir(uploadsPath, { recursive: true });
        }
    }

    private async sendToAiService(fileInfo: any) {
        try {
            const response = await axios.post(`${this.aiServiceUrl}/upload-document`, {
                file: fileInfo,
            });
            return response.data;
        } catch (error) {
            console.error('AI Service upload notification error:', error.message);
            //File is uploaded successfully, even if AI service fails to process it
        }
    }
}

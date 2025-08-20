import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Body,
  HttpException,
  HttpStatus, UseGuards
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AdminService } from './admin.service';
import {ApiBody, ApiConsumes} from "@nestjs/swagger";
import {UploadFileDto} from "./dto/file.upload.dto";
import {JwtAuthGuard} from "../common/guards/jwt-auth.guard";
import {RolesGuard} from "../common/guards/roles.guard";
import {Roles} from "../common/decorators/role.decorator";
import {Role} from "../common/constants/roles.const";

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('upload-document')
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles( Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads/documents',
          filename: (req, file, cb) => {
            const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join('');
            cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (file.mimetype.match(/\/(pdf)$/)) {
            cb(null, true);
          } else {
            cb(new HttpException('Only pdf files are allowed!', HttpStatus.BAD_REQUEST), false);
          }
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
        },
      }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @Body('description') description?: string,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    return this.adminService.uploadDocument(file, description);
  }
}

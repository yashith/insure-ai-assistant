import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {ConfigService} from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const config = new DocumentBuilder()
      .setTitle("Insurance AI backend")
      .setDescription('API documentation with executable Swagger UI')
      .setVersion('1.0')
      .addBearerAuth()  // For JWT
      .addSecurityRequirements('bearer')
      .build();
  const  document = SwaggerModule.createDocument(app,config);
  SwaggerModule.setup("api-docs",app,document);
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {ConfigService} from "@nestjs/config";
import {AllExceptionsFilter} from "./middlewear/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });
  
  const configService = app.get(ConfigService);
  app.setGlobalPrefix('api'); // Add this line to set the global prefix
  const config = new DocumentBuilder()
      .setTitle("Insurance AI backend")
      .setDescription('API documentation with executable Swagger UI')
      .setVersion('1.0')
      .setBasePath('/api') // Set the base path for the API
      .addBearerAuth()  // For JWT
      .addSecurityRequirements('bearer')
      .build();
  const  document = SwaggerModule.createDocument(app,config);
  SwaggerModule.setup("api/api-docs",app,document);
  const port = configService.get<number>('PORT') ?? 3000;
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API docs available at: http://localhost:${port}/api-docs`);

}
bootstrap();

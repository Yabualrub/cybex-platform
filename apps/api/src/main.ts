import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const isProd = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: isProd
      ? [
          'https://app.cybexs.com',
          'https://agent.cybexs.com',
          'https://cybexs.com',
        ]
      : 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 4001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();

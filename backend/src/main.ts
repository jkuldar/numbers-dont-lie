import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  const disableHttps = process.env.DISABLE_HTTPS === 'true';

  // Load HTTPS certificates if available (for production/dev HTTPS)
  const certPath = path.join(__dirname, '..', 'certs', 'cert.pem');
  const keyPath = path.join(__dirname, '..', 'certs', 'key.pem');

  if (!disableHttps && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    console.log('✓ HTTPS enabled');
  } else {
    console.log('⚠ Running without HTTPS (disabled or certificates not found)');
  }

  const app = await NestFactory.create(AppModule, { httpsOptions });
  
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`Application running on ${protocol}://localhost:${port}`);
}
bootstrap();

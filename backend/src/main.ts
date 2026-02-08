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
  
  // Allow both HTTP and HTTPS from frontend in development
  const allowedOrigins: string[] = [
    'http://localhost:5173',
    'https://localhost:5173',
  ];
  
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`Application running on ${protocol}://localhost:${port}`);
}
bootstrap();

FROM node:18-slim

WORKDIR /app

# Install OpenSSL for Prisma and SSL cert generation
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm install

COPY . .

# Generate SSL certificates for development
RUN chmod +x generate-ssl.sh && ./generate-ssl.sh

RUN npx prisma generate

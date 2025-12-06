# Use Node.js 18 LTS as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install libc6-compat and openssl for Prisma
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
# Install openssl for Prisma generate
RUN apk add --no-cache openssl openssl-dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy the built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Set the correct permissions
USER nodejs

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]

# Step 1: Base image
FROM node:18-alpine AS base

# Step 2: Install dependencies
FROM base AS deps
WORKDIR /app

COPY frontend/package.json ./
# If you created package-lock.json, change this back to `npm ci`
RUN npm install

# Step 3: Build the Next.js app
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .

RUN npm run build

# Step 4: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Safely copy public folder if it exists
COPY --from=builder /app/package.json ./package.json

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
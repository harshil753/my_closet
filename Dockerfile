# Multi-stage Docker build for My Closet Virtual Try-On
# Stage 1: Base image with Node.js and Python
FROM node:18-alpine AS base

# Install Python and build tools for AI processing
RUN apk add --no-cache python3 py3-pip build-base python3-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY requirements.txt ./

# Install Node.js dependencies with npm
RUN npm ci --production

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Stage 2: Production build
FROM base AS builder

# Copy source code
COPY . .

# Install all dependencies (including dev dependencies)
RUN npm ci

# Build the Next.js application
RUN npm run build

# Stage 3: Production runtime
FROM base AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Python services
COPY --from=builder /app/services ./services
COPY --from=builder /app/requirements.txt ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

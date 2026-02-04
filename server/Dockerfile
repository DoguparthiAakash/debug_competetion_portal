# ══════════════════════════════════════════════════════════
# Backend Dockerfile
# Uses Node 18 LTS on Alpine for a small image.
# ══════════════════════════════════════════════════════════

FROM node:18-alpine

# Install build tools needed by some native npm packages
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose the API port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]

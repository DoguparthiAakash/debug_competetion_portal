# ══════════════════════════════════════════════════════════
# Frontend Dockerfile
# Uses Node 18 LTS for the React dev server.
# For production, add a second stage with nginx.
# ══════════════════════════════════════════════════════════

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# react-scripts start binds to 0.0.0.0 inside containers
ENV HOST=0.0.0.0

CMD ["npx", "react-scripts", "start"]

# Local Network Deployment Guide

This guide will help you deploy the contest platform on your local network for 200 concurrent users.

## Prerequisites

- Windows machine with at least 8GB RAM (16GB recommended)
- Docker Desktop installed and running
- MongoDB installed or running via Docker
- All devices on the same local network (WiFi/LAN)

## Step 1: Find Your Local IP Address

### Windows:
1. Open Command Prompt
2. Run: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. Example: `192.168.1.100`

## Step 2: Configure Environment Variables

### Backend Configuration

Edit `contest-platform/.env`:
```env
# Keep MongoDB as localhost (running on server machine)
MONGO_URI=mongodb://localhost:27017/debugcontest

# Server settings
PORT=5000
NODE_ENV=production

# Change admin credentials!
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD

# JWT Secret - use a strong random string
JWT_SECRET=your_random_secret_key_here

# Docker limits (adjust based on your RAM)
DOCKER_TIMEOUT_SECONDS=15
DOCKER_MEMORY_LIMIT=256m
DOCKER_CPU_LIMIT=0.5

# Frontend URL - use your local IP
CLIENT_URL=http://192.168.1.100:3000
```

### Frontend Configuration

Create `contest-platform/frontend/.env.production.local`:
```env
# Replace with YOUR local IP address
REACT_APP_API_URL=http://192.168.1.100:5000/api
```

## Step 3: Configure Windows Firewall

### Allow Incoming Connections:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and enter ports: `3000, 5000`
6. Select "Allow the connection" → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name it "Contest Platform" → Finish

### Quick PowerShell Command:
```powershell
New-NetFirewallRule -DisplayName "Contest Platform Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Contest Platform Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

## Step 4: Start Services

### Option A: Using Docker Compose (Recommended)

```bash
cd contest-platform
docker-compose up -d
```

### Option B: Manual Start

**Terminal 1 - MongoDB:**
```bash
mongod
```

**Terminal 2 - Backend:**
```bash
cd contest-platform/backend
npm start
```

**Terminal 3 - Frontend:**
```bash
cd contest-platform/frontend
npm start
```

## Step 5: Verify Network Access

1. On the server machine, open: `http://localhost:3000`
2. On another device on the network, open: `http://YOUR_LOCAL_IP:3000`
   - Example: `http://192.168.1.100:3000`

## Step 6: Share URLs with Participants

Provide these URLs to all 200 participants:

- **Student Portal:** `http://YOUR_LOCAL_IP:3000`
- **Admin Dashboard:** `http://YOUR_LOCAL_IP:3000/admin`

## Monitoring During Contest

### Check Server Stats:
```
http://YOUR_LOCAL_IP:5000/api/stats
```

This shows:
- Active connections
- Request counts
- Docker execution queue status
- Memory usage

### Watch Backend Logs:
The backend will log:
- All incoming requests
- Slow requests (>2 seconds)
- Docker queue status
- Connection counts

## Troubleshooting

### Problem: Cannot access from other devices

**Solutions:**
1. Verify firewall rules are active
2. Check that backend shows "Network: http://YOUR_IP:5000" on startup
3. Ensure all devices are on the same network
4. Try disabling Windows Firewall temporarily to test

### Problem: Server is slow or unresponsive

**Solutions:**
1. Check `/api/stats` endpoint for queue status
2. Reduce concurrent Docker executions in `executionQueue.js`
3. Increase Docker resource limits if you have more RAM
4. Monitor Task Manager for CPU/RAM usage

### Problem: Docker containers failing

**Solutions:**
1. Ensure Docker Desktop is running
2. Check Docker has enough resources allocated
3. Reduce `DOCKER_MEMORY_LIMIT` if needed
4. Check Docker logs: `docker ps -a`

### Problem: MongoDB connection errors

**Solutions:**
1. Ensure MongoDB is running: `mongod`
2. Check connection string in `.env`
3. Verify MongoDB is listening on port 27017

## Performance Optimization Tips

### For 200 Concurrent Users:

1. **Increase MongoDB Pool Size:**
   - Already set to max 100 connections
   - Monitor with `/api/stats`

2. **Adjust Docker Queue:**
   - Edit `backend/services/executionQueue.js`
   - Change `maxConcurrent` based on your RAM
   - 16GB RAM: 10-15 concurrent
   - 32GB RAM: 20-30 concurrent

3. **Rate Limiting:**
   - Already configured in `backend/middleware/rateLimiter.js`
   - Adjust limits if needed

4. **Network Bandwidth:**
   - Use wired Ethernet for server if possible
   - Ensure good WiFi coverage for participants

## Pre-Contest Checklist

- [ ] Server machine has adequate RAM and CPU
- [ ] Docker Desktop is running
- [ ] MongoDB is running
- [ ] Firewall rules are configured
- [ ] Environment variables are set correctly
- [ ] Admin password has been changed
- [ ] Test access from multiple devices
- [ ] Monitor `/api/stats` endpoint
- [ ] Have backup plan for technical issues

## During Contest Monitoring

Watch for these metrics in `/api/stats`:
- `activeConnections`: Should be ≤ 200
- `executionQueue.running`: Should be ≤ max concurrent
- `executionQueue.queued`: Should not grow too large
- `memory.heapUsed`: Monitor for memory leaks

## Post-Contest

1. Export results: `http://YOUR_LOCAL_IP:5000/api/admin/export-excel`
2. Stop services: `docker-compose down` or `Ctrl+C` in terminals
3. Backup MongoDB data if needed
4. Review logs for any issues

## Support

If you encounter issues during the contest:
1. Check `/api/stats` for system health
2. Review backend console logs
3. Check Docker container status: `docker ps`
4. Monitor Windows Task Manager for resource usage

# Quick Start Guide - Local Network Deployment

## For Contest Organizers

### 1. Find Your Local IP (Windows)
```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

### 2. Configure Firewall
Run PowerShell as Administrator:
```powershell
New-NetFirewallRule -DisplayName "Contest Platform Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Contest Platform Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

### 3. Update Configuration

**Frontend:** Create `frontend/.env.production.local`
```env
REACT_APP_API_URL=http://YOUR_LOCAL_IP:5000/api
```
Replace `YOUR_LOCAL_IP` with your actual IP (e.g., `192.168.1.100`)

**Backend:** Update `.env` if needed
```env
CLIENT_URL=http://YOUR_LOCAL_IP:3000
```

### 4. Start Services

**Option A - Separate Terminals:**
```bash
# Terminal 1
cd backend
npm start

# Terminal 2
cd frontend
npm start
```

**Option B - Docker Compose:**
```bash
docker-compose up -d
```

### 5. Share URLs with Participants

Give students this URL:
```
http://YOUR_LOCAL_IP:3000
```

Admin dashboard:
```
http://YOUR_LOCAL_IP:3000/admin
```

### 6. Monitor System

Check stats during contest:
```
http://YOUR_LOCAL_IP:5000/api/stats
```

## Troubleshooting

**Can't access from other devices?**
- Check firewall rules
- Verify all devices on same network
- Confirm backend shows network IP on startup

**Server slow?**
- Check `/api/stats` for queue status
- Monitor Task Manager for CPU/RAM
- Reduce Docker concurrent limit if needed

**Need more help?**
See full guide: `docs/network-setup.md`

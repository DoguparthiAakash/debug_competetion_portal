/**
 * start-production.js
 * ───────────────────
 * Production startup script for local network deployment.
 * Validates environment, detects local IP, and starts services.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🚀 Contest Platform - Production Startup\n');

// ── Detect Local IP ──
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }

    return addresses;
}

// ── Validate Environment ──
function validateEnvironment() {
    const errors = [];

    // Check backend .env
    const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
    if (!fs.existsSync(backendEnvPath)) {
        errors.push('❌ Backend .env file not found');
    }

    // Check frontend .env.production.local
    const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env.production.local');
    if (!fs.existsSync(frontendEnvPath)) {
        console.warn('⚠️  Frontend .env.production.local not found - using defaults');
    }

    return errors;
}

// ── Main ──
(async () => {
    console.log('📋 Pre-flight Checks:\n');

    // Validate environment
    const errors = validateEnvironment();
    if (errors.length > 0) {
        console.error('Validation errors:');
        errors.forEach(err => console.error(err));
        process.exit(1);
    }

    // Detect local IPs
    const localIPs = getLocalIP();
    if (localIPs.length === 0) {
        console.error('❌ No local network IP detected. Are you connected to a network?');
        process.exit(1);
    }

    console.log('✅ Environment validated');
    console.log('✅ Local network IP(s) detected:\n');

    localIPs.forEach(ip => {
        console.log(`   📍 ${ip}`);
    });

    console.log('\n📝 Configuration:\n');
    console.log('   Backend will bind to: 0.0.0.0:5000');
    console.log('   Frontend should be accessible at:');
    localIPs.forEach(ip => {
        console.log(`      http://${ip}:3000`);
    });

    console.log('\n🔗 Share these URLs with participants:\n');
    localIPs.forEach(ip => {
        console.log(`   Student Portal: http://${ip}:3000`);
        console.log(`   Admin Dashboard: http://${ip}:3000/admin`);
    });

    console.log('\n📊 Monitoring:\n');
    localIPs.forEach(ip => {
        console.log(`   Stats: http://${ip}:5000/api/stats`);
    });

    console.log('\n⚙️  System Resources:\n');
    console.log(`   Total RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
    console.log(`   Free RAM: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
    console.log(`   CPUs: ${os.cpus().length}`);

    if (os.freemem() < 2 * 1024 * 1024 * 1024) {
        console.warn('\n⚠️  WARNING: Low available RAM. Close unnecessary applications.');
    }

    console.log('\n✅ Ready to start services!');
    console.log('\nRun the following commands in separate terminals:\n');
    console.log('   Terminal 1: cd backend && npm start');
    console.log('   Terminal 2: cd frontend && npm start');
    console.log('\nOr use Docker Compose:');
    console.log('   docker-compose up -d\n');
})();

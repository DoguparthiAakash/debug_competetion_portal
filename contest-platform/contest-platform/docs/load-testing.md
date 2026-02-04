# Load Testing Script for 200 Concurrent Users

This guide shows how to test your deployment with simulated concurrent users.

## Prerequisites

Install Artillery (load testing tool):
```bash
npm install -g artillery
```

## Test Scenarios

### 1. Health Check Test (Quick Validation)

Test basic connectivity with 50 concurrent users:
```bash
artillery quick --count 50 --num 10 http://YOUR_LOCAL_IP:5000/api/health
```

### 2. Registration Load Test

Create `test-registration.yml`:
```yaml
config:
  target: "http://YOUR_LOCAL_IP:5000"
  phases:
    - duration: 60
      arrivalRate: 20
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load - 50 users/sec"
    - duration: 60
      arrivalRate: 100
      name: "Peak load - 100 users/sec"

scenarios:
  - name: "Student Registration"
    flow:
      - post:
          url: "/api/student/register"
          json:
            name: "Test Student {{ $randomNumber() }}"
            email: "student{{ $randomNumber() }}@test.com"
            rollNumber: "ROLL{{ $randomNumber() }}"
            department: "CSE"
            year: "3"
            language: "Python"
```

Run:
```bash
artillery run test-registration.yml
```

### 3. Full Contest Simulation

Create `test-contest.yml`:
```yaml
config:
  target: "http://YOUR_LOCAL_IP:5000"
  phases:
    - duration: 300
      arrivalRate: 40
      name: "200 concurrent users over 5 minutes"

scenarios:
  - name: "Contest Flow"
    weight: 70
    flow:
      # Register
      - post:
          url: "/api/student/register"
          json:
            name: "Student {{ $randomNumber() }}"
            email: "s{{ $randomNumber() }}@test.com"
            rollNumber: "R{{ $randomNumber() }}"
            department: "CSE"
            year: "3"
            language: "Python"
          capture:
            - json: "$.rollNumber"
              as: "rollNumber"
      
      # Get questions
      - get:
          url: "/api/student/{{ rollNumber }}/questions/1"
      
      # Submit code (simulated)
      - think: 30
      - post:
          url: "/api/student/{{ rollNumber }}/submit"
          json:
            questionId: "test-question-id"
            code: "print('Hello World')"
            round: 1
  
  - name: "Admin Dashboard Check"
    weight: 30
    flow:
      - get:
          url: "/api/health"
      - get:
          url: "/api/stats"
```

Run:
```bash
artillery run test-contest.yml
```

## Interpreting Results

Artillery will show:
- **Response time (p95, p99)**: Should be < 2000ms
- **Request rate**: Actual requests per second
- **Error rate**: Should be < 1%
- **Scenarios completed**: Total successful flows

### Good Results:
```
Summary report:
  http.codes.200: 12000
  http.response_time.p95: 1500
  http.response_time.p99: 2000
  errors: 0
```

### Warning Signs:
- p95 > 3000ms: Server overloaded
- Errors > 5%: Configuration issues
- Timeouts: Increase Docker queue or reduce concurrent limit

## Manual Testing Checklist

### Before Contest:

1. **Test from Server Machine:**
   - [ ] Open `http://localhost:3000`
   - [ ] Register a test student
   - [ ] Access admin dashboard

2. **Test from Another Device:**
   - [ ] Connect to same network
   - [ ] Open `http://YOUR_LOCAL_IP:3000`
   - [ ] Register and test contest flow

3. **Monitor Stats:**
   - [ ] Open `http://YOUR_LOCAL_IP:5000/api/stats`
   - [ ] Check `activeConnections`
   - [ ] Check `executionQueue` status

4. **Firewall Test:**
   - [ ] Verify Windows Firewall rules active
   - [ ] Test from multiple devices
   - [ ] Check backend logs for connections

### During Load Test:

Monitor these metrics:
- **Task Manager**: CPU and RAM usage
- **Backend Console**: Request logs and slow requests
- **Stats Endpoint**: Active connections and queue length
- **Docker Desktop**: Container count and resource usage

## Troubleshooting Load Test Issues

### High Response Times
- Reduce `arrivalRate` in test config
- Increase Docker queue max concurrent
- Check system resources

### Connection Errors
- Verify firewall allows connections
- Check MongoDB connection pool
- Ensure Docker is running

### Memory Issues
- Reduce Docker memory limits
- Decrease concurrent executions
- Monitor with Task Manager

## Recommended Test Schedule

1. **Day Before Contest:**
   - Run health check test
   - Test with 10-20 real devices
   - Verify firewall and network

2. **1 Hour Before Contest:**
   - Run quick load test (50 users)
   - Check all services running
   - Monitor stats endpoint

3. **During Contest:**
   - Keep stats endpoint open
   - Monitor backend logs
   - Watch for slow requests

## Performance Benchmarks

For 200 concurrent users:
- **CPU Usage**: Should stay < 80%
- **RAM Usage**: Should stay < 80% of available
- **Response Time**: p95 < 2000ms
- **Queue Length**: Should not exceed 20
- **Active Connections**: Should peak at ~200

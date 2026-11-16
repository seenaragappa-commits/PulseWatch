# PulseWatch 1.5

**A full-stack application and network monitoring platform with automated health checks, incident intelligence and a responsive monitoring dashboard.**

PulseWatch monitors websites and network services across four protocols: HTTP/HTTPS, DNS, SSL certificates and TCP.

It automatically executes scheduled health checks, records monitoring history, identifies failure categories and creates incidents after three consecutive failures. When a service recovers, its incident is automatically resolved.

Built with React, Vite, Node.js, Express and SQLite, PulseWatch demonstrates practical full-stack engineering, network monitoring, application security, asynchronous processing, database management and automated testing.

## Key Features

### Multi-Protocol Monitoring

- **HTTP/HTTPS Monitoring:** Checks endpoint availability, HTTP status codes and response times.
- **DNS Monitoring:** Performs DNS resolution checks and detects resolution failures.
- **SSL Monitoring:** Monitors certificate validity and provides certificate expiry warnings.
- **TCP Monitoring:** Checks connectivity to configured TCP ports.

### Incident Management

- **Automatic Incident Creation:** Opens an incident after three consecutive failed checks.
- **Incident Deduplication:** Prevents multiple open incidents for the same monitor.
- **Failure Classification:** Identifies failure categories and provides diagnostic explanations.
- **Incident Tracking:** Updates failure counts and preserves incident history.
- **Automatic Recovery:** Resolves incidents when monitoring checks succeed.
- **Configuration Snapshots:** Preserves the monitored configuration associated with historical incidents.

### Security and Reliability

- SSRF protection and destination IP validation.
- DNS resolution validation and protection against unsafe destinations.
- Redirect validation and connection timeouts.
- Input validation and parameterized database queries.
- API security controls, including request restrictions and security headers.
- Controlled worker concurrency and protection against overlapping checks.
- Protection against stale monitoring results after configuration changes.

### Dashboard

- Responsive React dashboard.
- Monitor creation, editing, pausing and management.
- Real-time monitoring status and check history.
- Incident overview and detailed incident information.
- Desktop and mobile browser acceptance testing.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express.js |
| Database | SQLite, better-sqlite3 |
| API | REST API |
| Testing | Vitest, Supertest, Playwright |
| Security | SSRF protection, Helmet, CORS controls, input validation |

## Architecture

```text
          React + Vite Dashboard
                   |
                   v
             Express REST API
                   |
                   v
           Controllers and Routes
                   |
                   v
             Monitoring Services
             /    |    |    \
           HTTP  DNS  SSL   TCP
                   |
                   v
            Scheduler and Worker
                   |
                   v
               Repositories
                   |
                   v
                 SQLite
                   |
                   v
          Check History and Incidents
```

## Testing and Verification

PulseWatch 1.5 underwent automated testing and browser acceptance testing.

- **191 automated tests passed.**
- Desktop and mobile Playwright acceptance journeys passed.
- Production frontend build completed successfully.
- Production and full dependency audits reported zero vulnerabilities.
- Database migration, persistence and integrity checks passed.
- Monitoring lifecycle, incident creation, deduplication and recovery were tested.
- Security regression tests covered prohibited network destinations and SSRF-related scenarios.

Supporting test reports and verification evidence are available in the `docs/` directory.

## Installation and Setup

### Prerequisites

- Node.js LTS
- npm
- Windows PowerShell (commands below use PowerShell)

### 1. Clone the repository

```powershell
git clone https://github.com/seenaragappa-commits/PulseWatch.git
cd https://github.com/seenaragappa-commits/PulseWatch
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Start PulseWatch

```powershell
npm run dev
```

Open the dashboard:

**http://127.0.0.1:5173**

The frontend communicates with the backend API running on port `3001`.

Press `Ctrl + C` in the terminal to stop the development processes.

### 4. Run tests

```powershell
npm test
```

### 5. Build for production

```powershell
npm run build
```

For additional database verification, configuration details and API usage, refer to the project documentation.

## Project Documentation

Additional technical documentation is available in the `docs/` directory:

- `docs/ARCHITECTURE.md` — Application architecture and design.
- `docs/API.md` — REST API documentation.
- `docs/SECURITY.md` — Security policies and limitations.
- `docs/TCP-SECURITY.md` — TCP monitoring security considerations.
- `docs/ACCEPTANCE-TEST-REPORT.md` — Browser acceptance testing results.

## Deployment Scope and Limitations

PulseWatch 1.5 is designed for local operation and demonstration.

- Authentication and multi-user authorization are not implemented.
- The application is not intended for direct public internet exposure.
- Public deployment would require authentication, authorization, HTTPS, appropriate network controls, deployment hardening and operational monitoring.
- Physical-device testing and additional browser-engine testing have not been completed.

## Project Goals

This project was developed to explore practical full-stack engineering concepts, including:

- Designing modular backend architectures.
- Implementing network monitoring services.
- Managing asynchronous background tasks.
- Building automated incident management workflows.
- Working with database migrations and persistent storage.
- Applying application security and SSRF protections.
- Testing backend services and frontend browser workflows.

## Author

**Budyalu Moinu Prasad**

BCA Student | Aspiring Full-Stack Developer

GitHub: [seenaragappa-commits](https://github.com/seenaragappa-commits)
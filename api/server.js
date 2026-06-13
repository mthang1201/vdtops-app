const express = require('express');
const cors = require('cors');
const os = require('os');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || 'v1.0.1';

client.collectDefaultMetrics({
    labels: {
        app: 'vdtops-api',
        version: VERSION
    }
});

const httpRequestCounter = new client.Counter({
    name: 'vdt_api_http_requests_total',
    help: 'Total HTTP requests handled by the VDT API',
    labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new client.Histogram({
    name: 'vdt_api_http_request_duration_seconds',
    help: 'HTTP request duration in seconds for the VDT API',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const healthCheckCounter = new client.Counter({
    name: 'vdt_api_health_checks_total',
    help: 'Total health check requests handled by the VDT API'
});

const dataRequestCounter = new client.Counter({
    name: 'vdt_api_data_requests_total',
    help: 'Total business data requests handled by the VDT API'
});

const getRouteLabel = (req) => {
    if (req.route && req.route.path) {
        return req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
    }

    return req.path || 'unknown';
};

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Structured access logs for EFK/Kibana queries.
app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        console.log(JSON.stringify({
            service: 'api',
            event: 'http_request',
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            response_code: res.statusCode,
            duration_ms: Number(durationMs.toFixed(3)),
            time: new Date().toISOString(),
            user_agent: req.headers['user-agent'] || null
        }));
    });

    next();
});

// Prometheus HTTP request metrics
app.use((req, res, next) => {
    const endTimer = httpRequestDuration.startTimer();

    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: getRouteLabel(req),
            status_code: String(res.statusCode)
        };

        httpRequestCounter.inc(labels);
        endTimer(labels);
    });

    next();
});

// GET /api/health - Production liveness/readiness probe target
app.get('/api/health', (req, res) => {
    healthCheckCounter.inc();

    res.status(200).json({
        status: 'UP',
        version: VERSION,
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// GET /api/data - Business/Operational metrics for the front-end dashboard
app.get('/api/data', (req, res) => {
    dataRequestCounter.inc();

    res.status(200).json({
        assignment: {
            organization: "Viettel Digital Talent Cloud 2026",
            project: "Final Assignment",
            candidate: "DevOps Engineer Candidate",
            topic: "Complete GitOps CI/CD Delivery Pipeline"
        },
        cluster_info: {
            environment: "development",
            namespace: "dev",
            provider: "Minikube (single node)",
            virtualization: "OrbStack macOS",
            hostname: os.hostname()
        },
        gitops_stack: {
            continuous_integration: "Jenkins Pipeline (Declarative)",
            artifact_registry: "Docker Hub Container Registry",
            deployment_engine: "ArgoCD (Self-healing, Auto-sync, Pruning)",
            packaging: "Helm v3 Charts",
            git_tag_version: VERSION
        },
        status: "synchronized"
    });
});

// GET /metrics - Prometheus scrape endpoint
app.get('/metrics', async (req, res, next) => {
    try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
    } catch (err) {
        next(err);
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(JSON.stringify({
        service: 'api',
        event: 'unhandled_exception',
        method: req.method,
        path: req.originalUrl || req.url,
        status: 500,
        response_code: 500,
        time: new Date().toISOString(),
        error: err.message
    }));

    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Listen on all network interfaces for container environments
app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`VDT API Server running on port ${PORT}`);
    console.log(`Application Version: ${VERSION}`);
    console.log(`Container Hostname: ${os.hostname()}`);
    console.log(`========================================`);
});

const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || 'v1.0.1';

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - UA: ${req.headers['user-agent']}`);
    next();
});

// GET /api/health - Production liveness/readiness probe target
app.get('/api/health', (req, res) => {
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

// Global error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] Unhandled Exception: ${err.message}`);
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

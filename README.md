# VDT Cloud GitOps Delivery System 🚀

This repository contains the complete production-grade source code, Helm charts, and Jenkins pipeline definitions for the **Viettel Digital Talent Cloud 2026 final assignment**. It implements a full GitOps CI/CD lifecycle using a modern microservice setup.

---

## 📂 Repository Structure

The project is split into two logical repositories (represented as directories in this workspace for simplicity):

```text
helmops-delivery-system/
├── app-repo/                       # 💻 Developer Application Repository
│   ├── web/                        #   ├── Frontend (Nginx static dashboard, port 8080)
│   │   ├── Dockerfile
│   │   ├── index.html              #   │   └── Glassmorphic dark UI dashboard
│   │   └── nginx.conf              #   │   └── Non-root secure port routing
│   ├── api/                        #   ├── Backend (Node.js/Express, port 5000)
│   │   ├── Dockerfile
│   │   ├── server.js               #   │   └── Endpoints: /api/health, /api/data
│   │   └── package.json            #   │   └── Non-root node user configuration
│   ├── charts/                     #   └── Helm Packaging
│   │   └── my-app/
│   │       ├── Chart.yaml          #       └── Chart metadata
│   │       ├── values.yaml         #       └── Default configuration values
│   │       └── templates/
│   │           ├── _helpers.tpl    #       └── DNS-1123 naming helper templates
│   │           ├── web-deployment.yaml
│   │           ├── web-service.yaml
│   │           ├── api-deployment.yaml
│   │           ├── api-service.yaml
│   │           └── ingress.yaml    #       └── Single Ingress routing / and /api
│   ├── Jenkinsfile                 #   └── 10-Stage Declarative CI/CD pipeline
│   └── README.md                   #   └── You are here!
│
└── config-repo/                    # 🐙 GitOps Environment Repository
    ├── dev/
    │   └── values.yaml             #   └── Dev values override (updated by Jenkins)
    └── argocd-app.yaml             #   └── ArgoCD Application Sync Manifest
```

---

## 🛠️ Microservices Architecture

The system consists of two secure, production-grade microservices running on a **Minikube** Kubernetes cluster:

1. **Frontend Web (`web`)**: 
   - Uses `nginx:1.25-alpine` running as a non-privileged user (UID `101`) on port `8080` for high security.
   - Hosts a stunning, interactive glassmorphic dashboard showcasing real-time API connection checks, active environment variables, dynamic Git tags, and responsive micro-animations.
2. **Backend API (`api`)**:
   - Built on `node:20-alpine` Express, running as a secure, non-root user (UID `1000`) on port `5000`.
   - Offers robust health monitoring via `/api/health` (used for liveness/readiness probes) and operational telemetry data via `/api/data`.

---

## 🔄 Deployment Flow Step-by-Step

Our CI/CD & GitOps delivery flow is divided into 10 explicit pipeline stages automated via Jenkins and finalized by ArgoCD:

```
[ Developer Git Tag ]
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │                   Jenkins Pipeline                     │
 ├────────────────────────────────────────────────────────┤
 │  Stage 1: Checkout Source                              │
 │  Stage 2: Read Git Tag (e.g., v1.0.1)                  │
 │  Stage 3: Build Web Container Image                    │
 │  Stage 4: Build API Container Image                    │
 │  Stage 5: Push Web Image to Docker Hub                 │
 │  Stage 6: Push API Image to Docker Hub                 │
 │  Stage 7: Clone GitOps config-repo                     │
 │  Stage 8: Update config-repo/dev/values.yaml tags      │
 │  Stage 9: Commit & Push config-repo back to GitHub     │
 │  Stage 10: Print success telemetry / notifications     │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │                      ArgoCD                            │
 ├────────────────────────────────────────────────────────┤
 │  Detects Commit Change in config-repo/dev/values.yaml  │
 │  Pulls my-app Helm chart templates from app-repo       │
 │  Merges dev/values.yaml overrides dynamically          │
 │  Auto-prunes old resources & heals configurations      │
 └──────────────────────────┬─────────────────────────────┘
                            │ (Declarative Sync)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │                     Minikube                           │
 ├────────────────────────────────────────────────────────┤
 │  Updates Web & API pods with zero downtime             │
 └────────────────────────────────────────────────────────┘
```

1. **Trigger**: A developer pushes a release tag (e.g., `git tag v1.0.1 && git push origin v1.0.1`) to the `app-repo`.
2. **CI Checkout & Version Parsing (Stages 1-2)**: Jenkins detects the tag trigger, checks out the code, and extracts the tag version. If run on a test branch without an explicit tag, it dynamically generates a hash-based fallback version (`v1.0.1-<commit_hash>`) to guarantee the pipeline succeeds during testing.
3. **Containerization (Stages 3-6)**: Jenkins compiles the multi-stage, high-performance Docker files for both `web` and `api`. The backend build dynamically injects the tag version as a compilation argument. Images are pushed using secure masked credentials to Docker Hub using standard formats:
   - `<dockerhub_username>/web:v1.0.1`
   - `<dockerhub_username>/api:v1.0.1`
4. **GitOps Trigger (Stages 7-9)**: Jenkins pulls the separate `config-repo`, runs a secure Python-based inline editor to update only the specific `web.tag` and `api.tag` fields inside `dev/values.yaml` (fully preserving structure and comments), commits the changes (`chore(gitops): release version v1.0.1 [skip ci]`), and pushes them back.
5. **Reconciliation & Deployment (ArgoCD)**: ArgoCD detects the change in the config repository. Since the Application uses the **Multi-Source** framework, ArgoCD dynamically fetches the Helm chart templates from `app-repo` and merges them with the updated environment overrides in `config-repo`. It initiates an automated sync, self-heals any configuration drifts, and deploys the new containers with zero downtime.

---

## 💻 Validation & Testing Shell Commands

Run these shell commands inside Minikube to manually deploy, upgrade, and audit the application:

### 1. Helm Operations

*   **Syntax Verification & Dry-run**:
    Verify the Helm templates compile correctly with the development overrides:
    ```bash
    # Run from the root workspace
    helm lint app-repo/charts/my-app
    helm template my-app-release app-repo/charts/my-app --values config-repo/dev/values.yaml
    ```

*   **Helm Direct Installation**:
    Deploy the Helm chart into a dedicated `dev` namespace manually for pre-flight testing:
    ```bash
    kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -
    helm install my-app-release app-repo/charts/my-app --values config-repo/dev/values.yaml --namespace dev
    ```

*   **Helm Direct Upgrade**:
    Apply rolling upgrades when modifying chart values:
    ```bash
    helm upgrade my-app-release app-repo/charts/my-app --values config-repo/dev/values.yaml --namespace dev
    ```

### 2. Kubernetes Auditing Commands

Use these commands to verify that pods, services, and routing rules are deployed successfully:

*   **Audit Pods**:
    Ensure that pods are `Running` and replicas are distributed correctly:
    ```bash
    kubectl get pods -n dev -o wide
    ```

*   **Audit Services**:
    Confirm that services are created with internal IP mappings:
    ```bash
    kubectl get svc -n dev
    ```

*   **Audit Ingress**:
    Validate that the Ingress controller correctly registers hostnames and maps routes:
    ```bash
    kubectl get ingress -n dev
    ```

*   **Exposing the App Locally (Minikube)**:
    Since Minikube runs inside a virtualized bridge network on macOS, we need to map the ingress hostname. 
    1. Retrieve the Minikube IP:
       ```bash
       minikube ip
       ```
    2. Add the IP mapping to `/etc/hosts`:
       ```text
       # Add this line at the bottom of /etc/hosts
       <MINIKUBE_IP> vdt-app.local
       ```
    3. Ensure the ingress addon is enabled:
       ```bash
       minikube addons enable ingress
       ```
    4. Open the application in your browser: `http://vdt-app.local`

---

## 📸 Step-by-Step Assignment Demonstration & Screenshots

For a perfect grade on your Viettel Digital Talent final project, capture and organize the following screenshots during your demonstration:

### 📂 Screenshot 1: Repository Structures
*   **What to show**: Run `tree app-repo/` and `tree config-repo/` in your macOS terminal.
*   **Why it matters**: Demonstrates clean, production-ready directory separation conforming to enterprise GitOps best practices.

### ⚓ Screenshot 2: Docker Hub Repositories
*   **What to show**: Your Docker Hub repositories page showing `<your_username>/web` and `<your_username>/api` tags list (e.g. showing `v1.0.1` tag active).
*   **Why it matters**: Proves container builds are successfully published and publicly available.

### ⚙️ Screenshot 3: Jenkins Successful Build & Pipeline Stages
*   **What to show**: The Jenkins Blue Ocean view or stage view showing all **10 stages** in green. Capture the console logs from **Stage 2 (Read Git Tag)**, **Stage 8 (Update values.yaml)**, and the successful console banner in **Stage 10**.
*   **Why it matters**: Validates complete automation of the CI/CD pipeline.

### 🐙 Screenshot 4: ArgoCD Application Visual Map
*   **What to show**: The ArgoCD UI showing the `my-app-dev` application in `Synced` and `Healthy` status. Expand the tree view showing the Ingress, the Web and API services, Deployments, and active running Pods.
*   **Why it matters**: Proves the GitOps sync engine is functioning, self-healing, and dynamically reconciling kubernetes resources.

### ⛵ Screenshot 5: Kubernetes Pod, Service, and Ingress Resource Audits
*   **What to show**: Run the command terminal outputs:
    ```bash
    kubectl get pods,svc,ingress -n dev
    ```
    Highlight the active state of `my-app-web` and `my-app-api` pods and the mapping of `/` and `/api` paths inside the ingress resource.
*   **Why it matters**: Shows examiners that standard Kubernetes resources are correctly instantiated in the cluster.

### 💻 Screenshot 6: The Live Application Dashboard View
*   **What to show**: Open `http://vdt-app.local` in your browser. Show the beautiful dark-mode Viettel portal dashboard. Click the **"Check API Status"** button. The terminal inside the dashboard should output:
    `[SUCCESS] Connected to API. Latency: XXms`
    and the API Metric Card should transition to green **"Online"** displaying the pod name.
*   **Why it matters**: This is the ultimate visual proof. It shows that Nginx and Node.js are running perfectly as non-root users, and the Ingress is correctly routing `/` traffic to the front-end and `/api` requests to the backend!

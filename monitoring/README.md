# Monitoring with Prometheus

This directory contains the setup required for the Monitoring section of the final assignment:

- the API exposes Prometheus metrics at `/metrics`;
- Prometheus runs as a Kubernetes Deployment in the `monitoring` namespace;
- Prometheus scrapes the API target through the in-cluster service DNS name.

## Prerequisites

Install Ansible Kubernetes dependencies on the machine that can access the cluster:

```bash
ansible-galaxy collection install -r requirements.yml
python3 -m pip install kubernetes openshift
```

Make sure the application is already deployed in the `dev` namespace. With the provided ArgoCD Application, the API service name is expected to be:

```text
my-app-dev-api.dev.svc.cluster.local:5000
```

If you installed the Helm chart with another release name, update the target in `prometheus-configmap.yaml` before running the playbook.

## Deploy

Run from this directory:

```bash
ansible-playbook prometheus-k8s-playbook.yaml
```

## Verify

Check Kubernetes resources:

```bash
kubectl get pods,svc,configmap -n monitoring
kubectl get svc -n dev
```

Open Prometheus through the NodePort:

```bash
minikube service prometheus -n monitoring --url
```

Or use:

```text
http://<MINIKUBE_IP>:30900
```

In Prometheus, open **Status > Targets** and confirm the `vdtops-api` target is `UP`.

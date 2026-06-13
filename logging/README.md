# Logging with EFK

This directory contains the setup for the Logging section of the final assignment:

- Elasticsearch stores parsed application logs.
- Fluentd runs as a DaemonSet and tails Kubernetes container logs.
- Kibana is exposed through NodePort `30020`.
- The `web` and `api` services emit JSON access logs with `method`, `path`, and `status` fields.

## Prerequisites

Install Ansible Kubernetes dependencies on the machine that can access the cluster:

```bash
ansible-galaxy collection install -r requirements.yml
python3 -m pip install kubernetes openshift
```

Deploy the application first. The Fluentd filter expects the Helm release to run in namespace `dev` and the pods to have `component=web` or `component=api` labels, which are already set in the chart templates.

## Deploy

Run from this directory:

```bash
ansible-playbook logging-k8s-playbook.yaml
```

## Generate Request Logs

Send traffic to both services through the app ingress:

```bash
curl http://vdt-app.local/
curl http://vdt-app.local/api/health
curl http://vdt-app.local/api/data
```

You can also call the services from inside the cluster:

```bash
kubectl run curl-logging-test --rm -i --restart=Never --image=curlimages/curl -- \
  sh -c 'curl -s http://my-app-dev-web.dev.svc.cluster.local/ && curl -s http://my-app-dev-api.dev.svc.cluster.local:5000/api/health'
```

## Verify

Check Kubernetes resources:

```bash
kubectl get pods,svc,configmap -n logging
kubectl logs -n logging daemonset/fluentd --tail=100
```

Open Kibana:

```bash
minikube service kibana -n logging --url
```

Or use:

```text
http://<NODE_IP>:30020
```

Create a Kibana data view for `vdtops-logs-*` with time field `@timestamp`. In Discover, filter by:

```text
event : "http_request" and path : "/api/health"
```

Useful fields for the assignment screenshot:

```text
service, method, path, status, response_code, kubernetes.pod_name, kubernetes.container_name
```

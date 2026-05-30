FROM nginx:1.25-alpine

LABEL maintainer="Viettel Digital Talent Candidate" \
      version="1.0.1" \
      description="Production Nginx Frontend running as non-root user for K8s security compliance"

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy HTML assets
COPY index.html /usr/share/nginx/html/index.html

# Create directories and adjust permissions for non-root execution (nginx has uid 101 in alpine)
RUN touch /var/run/nginx.pid && \
    chown -R 101:101 /var/run/nginx.pid /usr/share/nginx/html /var/log/nginx /etc/nginx /tmp

# Switch to the non-root user
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

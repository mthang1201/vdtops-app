FROM node:20-alpine

LABEL maintainer="Viettel Digital Talent Candidate" \
      version="1.0.1" \
      description="Production Node.js API Backend running as secure non-root node user"

WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

COPY server.js ./

# Secure working directory permissions
RUN chown -R node:node /usr/src/app

# Switch to the official non-root node user (provided by the alpine node image)
USER node

EXPOSE 5000

ENV PORT=5000 \
    NODE_ENV=production \
    APP_VERSION=v1.0.1

CMD ["node", "server.js"]

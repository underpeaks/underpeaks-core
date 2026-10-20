# Dockerfile
FROM node:22-bookworm-slim

# Build tools for native modules (bcrypt etc.)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app && mkdir /data && chown node:node /data
USER node

ENV NEXT_TELEMETRY_DISABLED=1

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

# Added last so editing these doesn't invalidate the slow layers above.
# The installer looks for /shared_models (one level above the app folder).
# sed strips Windows line endings, which would otherwise break the script.
USER root
COPY --from=shared --chown=node:node . /shared_models
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod 755 /usr/local/bin/docker-entrypoint.sh
USER node

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
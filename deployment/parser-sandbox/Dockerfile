FROM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9
WORKDIR /parser
COPY deployment/parser-sandbox/package.json deployment/parser-sandbox/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY scripts/document-extract-worker.cjs ./worker.cjs
COPY scripts/legacy-office.cjs ./legacy-office.cjs
USER 65532:65532
ENTRYPOINT ["node", "--max-old-space-size=128", "/parser/worker.cjs"]

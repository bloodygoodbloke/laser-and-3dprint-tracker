FROM node:26-bookworm
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npx playwright install --with-deps chromium && npm run build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_ENTRA_CLIENT_ID=
ARG VITE_ENTRA_AUTHORITY=
ENV VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID VITE_ENTRA_AUTHORITY=$VITE_ENTRA_AUTHORITY
RUN npm run build
WORKDIR /app/backend
ARG APP_VERSION=
ARG BUILD_NUMBER=local
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ARG BUILD_DATE=unknown
ARG APP_ENVIRONMENT=Development
ENV APP_VERSION=$APP_VERSION BUILD_NUMBER=$BUILD_NUMBER GIT_COMMIT=$GIT_COMMIT GIT_BRANCH=$GIT_BRANCH BUILD_DATE=$BUILD_DATE APP_ENVIRONMENT=$APP_ENVIRONMENT
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/data/makerflow.db
ENV UPLOAD_DIR=/data/uploads
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

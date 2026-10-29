FROM node:24-bookworm
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci --engine-strict=false
COPY backend/ ./
RUN npx prisma generate && npx playwright install --with-deps chromium && npm run build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --engine-strict=false
COPY frontend/ ./
RUN npm run build
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

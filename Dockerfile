FROM oven/bun:1.3.9 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "bun run db:migrate && bun run src/main.ts"]

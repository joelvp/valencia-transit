FROM oven/bun:1.4.3 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "bun run db:migrate && bun run src/main.ts"]

import type { Context, MiddlewareFn } from "grammy";
import type { UserRepository } from "@/core/domain/user/UserRepository";

export interface UserContext {
  requestId: string;
  userId: string;
}

export type ExtendedContext = Context & UserContext;

export function createUserMiddleware(
  userRepository: UserRepository,
): MiddlewareFn<ExtendedContext> {
  return async (ctx, next) => {
    const requestId = crypto.randomUUID();
    const chatId = ctx.chat?.id;
    const from = ctx.from;

    if (chatId !== undefined && from !== undefined) {
      const metadata: Record<string, unknown> = {};
      if (from.first_name) metadata["firstName"] = from.first_name;
      if (from.username) metadata["username"] = from.username;
      if (from.last_name) metadata["lastName"] = from.last_name;

      const userId = await userRepository.upsertByProvider("telegram", chatId.toString(), metadata);

      ctx.requestId = requestId;
      ctx.userId = userId;
    } else {
      ctx.requestId = requestId;
      ctx.userId = "";
    }

    await next();
  };
}

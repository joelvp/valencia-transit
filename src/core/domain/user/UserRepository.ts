export interface UserRepository {
  upsert(user: {
    chatId: number;
    username?: string;
    firstName: string;
    lastName?: string;
  }): Promise<void>;
}

export interface UserRepository {
  upsert(user: {
    chatId: number;
    username?: string;
    firstName: string;
    lastName?: string;
    language?: string;
  }): Promise<void>;
  findAllLanguages(): Promise<Map<number, string>>;
}

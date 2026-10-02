/** Runs `work` atomically: every repository call inside it commits together or rolls back together. */
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}

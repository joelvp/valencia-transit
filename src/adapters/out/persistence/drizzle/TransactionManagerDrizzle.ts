import { AsyncLocalStorage } from "node:async_hooks";
import type { TransactionManager } from "@/core/domain/shared/TransactionManager";
import type { AppDatabase } from "@/adapters/out/persistence/drizzle/db";

/** Keeps the active transaction in async context, so repositories pick it up without taking a `tx` param. */
export class TransactionManagerDrizzle implements TransactionManager {
  private readonly storage = new AsyncLocalStorage<AppDatabase>();

  constructor(private readonly rootDb: AppDatabase) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    // Nested run joins the outer transaction instead of opening a second one.
    if (this.storage.getStore()) return work();
    return this.rootDb.transaction((tx) => this.storage.run(tx as unknown as AppDatabase, work));
  }

  /** The db repositories should receive: routes each call to the active transaction, if any. */
  transactionAwareDb(): AppDatabase {
    return new Proxy(this.rootDb, {
      get: (target, prop) => {
        const executor = this.storage.getStore() ?? target;
        const value = Reflect.get(executor, prop, executor);
        return typeof value === "function" ? value.bind(executor) : value;
      },
    });
  }
}

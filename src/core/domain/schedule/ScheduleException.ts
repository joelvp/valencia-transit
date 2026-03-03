export class ScheduleException {
  constructor(
    readonly date: string,
    readonly isActive: boolean,
  ) {}

  isServiceAdded(): boolean {
    return this.isActive;
  }

  isServiceRemoved(): boolean {
    return !this.isActive;
  }

  equals(other: ScheduleException): boolean {
    return this.date === other.date && this.isActive === other.isActive;
  }
}

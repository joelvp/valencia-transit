export class Weekdays {
  constructor(
    readonly monday: boolean,
    readonly tuesday: boolean,
    readonly wednesday: boolean,
    readonly thursday: boolean,
    readonly friday: boolean,
    readonly saturday: boolean,
    readonly sunday: boolean,
  ) {}

  equals(other: Weekdays): boolean {
    return (
      this.monday === other.monday &&
      this.tuesday === other.tuesday &&
      this.wednesday === other.wednesday &&
      this.thursday === other.thursday &&
      this.friday === other.friday &&
      this.saturday === other.saturday &&
      this.sunday === other.sunday
    );
  }
}

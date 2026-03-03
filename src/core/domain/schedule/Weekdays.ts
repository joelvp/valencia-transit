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

  isActiveOnDay(dayOfWeek: number): boolean {
    const days = [
      this.sunday,
      this.monday,
      this.tuesday,
      this.wednesday,
      this.thursday,
      this.friday,
      this.saturday,
    ];
    return days[dayOfWeek] ?? false;
  }

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

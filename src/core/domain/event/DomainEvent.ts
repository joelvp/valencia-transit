export abstract class DomainEvent {
  readonly occurredOn: Date;
  readonly eventId: string;
  abstract readonly eventName: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = crypto.randomUUID();
  }
}

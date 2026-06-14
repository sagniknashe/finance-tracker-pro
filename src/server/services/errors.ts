/** Shared domain errors, mapped to HTTP status codes at the API edge. */

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ServiceValidationError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ServiceValidationError";
    this.field = field;
  }
}

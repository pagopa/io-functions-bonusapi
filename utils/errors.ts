import { ExceptionTelemetry } from "applicationinsights/out/Declarations/Contracts";

export interface IApplicationErrorMetadata {
  [key: string]: string;
}

export interface IApplicationError {
  readonly message: string;
  readonly details: string;
  readonly rethrow: boolean;
  readonly metadata?: IApplicationErrorMetadata;
}

export class ApplicationError extends Error implements IApplicationError {
  public details: string;
  public rethrow: boolean;
  public metadata?: IApplicationErrorMetadata;

  constructor(
    message: string,
    details: string,
    rethrow: boolean,
    metadata?: IApplicationErrorMetadata
  ) {
    super(message);
    this.details = details;
    this.rethrow = rethrow;
    this.metadata = metadata;
  }

  public fullMessage(): string {
    return `${this.message}|DETAILS${this.details}`;
  }
}

export const applicationErrorToExceptionTelemetry = (
  applicationError: ApplicationError
): ExceptionTelemetry => ({
  exception: applicationError,
  properties: applicationError.metadata
});

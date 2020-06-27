import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { ApplicationError } from "./errors";

const safeStringify = (data: unknown) => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return "Stringify error";
  }
};

export const decodeOrThrowApplicationError = <A, O>(
  type: t.Type<A, O>,
  input: unknown,
  applicationErrorMessage: string = "Decoding error"
): A => {
  return type.decode(input).getOrElseL(errs => {
    throw new ApplicationError(
      applicationErrorMessage,
      readableReport(errs),
      false,
      {
        input: safeStringify(input)
      }
    );
  });
};

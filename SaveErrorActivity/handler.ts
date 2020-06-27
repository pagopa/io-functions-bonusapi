import * as t from "io-ts";

import { Context } from "@azure/functions";

import { decodeOrThrowApplicationError } from "../utils/decode";
import { TableStorageError, TableStorageErrorLoggerT } from "../utils/loggers";

export const ActivityInput = TableStorageError;
export type ActivityInput = t.TypeOf<typeof ActivityInput>;

/**
 * Save an error to table storage
 */
export const getSaveErrorActivityHandler = (
  tableStorageErrorLogger: TableStorageErrorLoggerT
) => {
  return async (_: Context, input: unknown): Promise<void> => {
    try {
      const tableStorageError = decodeOrThrowApplicationError(
        ActivityInput,
        input
      );

      await tableStorageErrorLogger(tableStorageError);
    } catch (e) {
      // Ignore errors
    }
  };
};

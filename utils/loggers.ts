import * as t from "io-ts";

import { Context } from "@azure/functions";
import { TableService } from "azure-storage";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";
import { insertTableEntity } from "io-functions-commons/dist/src/utils/azure_storage";

import { bonusStorageTableService } from "../services/tableServices";
import { ApplicationError } from "./errors";

export const TableStorageError = t.interface({
  id: t.string,

  requestId: t.string,

  requestPayload: t.string,

  message: t.string
});
export type TableStorageError = t.TypeOf<typeof TableStorageError>;

export const getTableStorageErrorLogger = (
  tableService: TableService,
  tableName: string
) => async (error: TableStorageError) => {
  try {
    await insertTableEntity(tableService, tableName, {
      PartitionKey: error.id,
      RowKey: new Date().toISOString(),

      RequestId: error.requestId,

      RequestPayload: error.requestPayload,

      Message: error.message
    });
  } catch (e) {
    // Ignore errors
  }
};

export type TableStorageErrorLoggerT = ReturnType<
  typeof getTableStorageErrorLogger
>;

/**
 * Log using the orchestrator context
 */
export const getContextErrorLogger = (
  context: IOrchestrationFunctionContext | Context,
  logPrefix: string
) => (error: Error) => {
  if (error instanceof ApplicationError) {
    context.log.error(`${logPrefix}|${error.message}`);
    context.log.verbose(
      `${logPrefix}|${error.message}|DETAILS=${error.details}`
    );
  } else {
    context.log.error(`${logPrefix}|An error occurred`);
    context.log.verbose(
      `${logPrefix}|An error occurred|DETAILS=${error.message}`
    );
  }
};
export type GetContextErrorLoggerT = typeof getContextErrorLogger;

export const defaultTableStorageErrorLogger = getTableStorageErrorLogger(
  bonusStorageTableService,
  "RedeemedErrors"
);

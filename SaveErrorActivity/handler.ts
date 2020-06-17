import * as t from "io-ts";

import { Context } from "@azure/functions";

import { readableReport } from "italia-ts-commons/lib/reporters";
import { RedeemedBonus } from "../generated/definitions/RedeemedBonus";

export const RedeemedError = t.interface({
  Message: t.string,
  PartitionKey: t.string,
  Request: RedeemedBonus,
  RowKey: t.string
});
export type RedeemedError = t.TypeOf<typeof RedeemedError>;

export const ActivityInput = t.interface({
  bonusId: t.string,
  errorMessage: t.string,
  request: RedeemedBonus,
  requestId: t.string
});
export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const ActivityResultFailure = t.interface({
  kind: t.literal("FAILURE"),
  reason: t.string
});
export type ActivityResultFailure = t.TypeOf<typeof ActivityResultFailure>;

export const ActivityResultSuccess = t.interface({
  kind: t.literal("SUCCESS")
});
export type ActivityResultSuccess = t.TypeOf<typeof ActivityResultSuccess>;

export const ActivityResult = t.taggedUnion("kind", [
  ActivityResultFailure,
  ActivityResultSuccess
]);
export type ActivityResult = t.TypeOf<typeof ActivityResult>;

const failure = (reason: string): ActivityResultFailure =>
  ActivityResultFailure.encode({
    kind: "FAILURE",
    reason
  });

const success = (): ActivityResultSuccess =>
  ActivityResultSuccess.encode({
    kind: "SUCCESS"
  });

/**
 * Save the request to a blob using an output binding defined in function.json file.
 */
export const getSaveErrorActivityHandler = () => {
  // tslint:disable-next-line: no-object-mutation
  return async (context: Context, input: unknown): Promise<ActivityResult> => {
    const logPrefix = "SaveErrorActivity";
    return ActivityInput.decode(input).fold<ActivityResult>(
      errs => {
        context.log.error(`${logPrefix}|Error decoding input`);
        context.log.verbose(
          `${logPrefix}|Error decoding input|ERROR=${readableReport(errs)}`
        );
        return failure("Cant decode input");
      },
      inputDecoded => {
        // tslint:disable-next-line: no-object-mutation
        context.bindings.redeemedErrors = RedeemedError.encode({
          Message: inputDecoded.errorMessage,
          PartitionKey: inputDecoded.bonusId,
          Request: inputDecoded.request,
          RowKey: inputDecoded.requestId
        });
        return success();
      }
    );
  };
};

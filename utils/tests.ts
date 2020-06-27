const failMode = process.env.ENABLE_TEST_MODE === "true";

export const throwRandomly = (
  failurePercentage: number,
  error = new Error("Random error")
) => {
  if (
    failMode &&
    failurePercentage > 0 &&
    Math.random() <= failurePercentage / 100
  ) {
    throw error;
  }
};

import { expect, test } from "@jest/globals";
import { mapSettledWithConcurrency } from "../../dist/map_settled_with_concurrency.js";

test("bounds concurrency and preserves settled-result order", async () => {
  let active = 0;
  let maxActive = 0;

  const results = await mapSettledWithConcurrency([0, 1, 2, 3, 4, 5], 3, async (value) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    if (value === 2) throw new Error("expected failure");
    return value * 2;
  });

  expect(maxActive).toBe(3);
  expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled", "rejected", "fulfilled", "fulfilled", "fulfilled"]);
  expect(results[0]).toEqual({ status: "fulfilled", value: 0 });
  expect(results[2]).toMatchObject({ status: "rejected", reason: new Error("expected failure") });
  expect(results[5]).toEqual({ status: "fulfilled", value: 10 });
});

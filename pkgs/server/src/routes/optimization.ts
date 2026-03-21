import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import * as v from "valibot";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import {
  runSourcingOptimizer,
  type OptimizationRequest,
  type SourcingPlan,
} from "../services/sourcingOptimizer.js";

const optimization = new Hono<AuthenticatedContext>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const LineItemSchema = v.object({
  item: v.pipe(v.string(), v.minLength(1, "item is required")),
  qtyNeeded: v.pipe(v.number(), v.minValue(0.01, "qtyNeeded must be positive")),
  unit: v.optional(v.picklist(["kg", "lb", "count", "bunch"]), "kg"),
  maxPricePerUnit: v.optional(v.number()),
  acceptSubstitutes: v.optional(v.boolean()),
  notes: v.optional(v.string()),
});

const ConstraintsSchema = v.object({
  maxTotalBudget: v.optional(v.pipe(v.number(), v.minValue(0))),
  preferredDeliveryWindow: v.optional(
    v.object({
      startAt: v.string(),
      endAt: v.string(),
    })
  ),
  maxSuppliers: v.optional(v.pipe(v.number(), v.minValue(1))),
  prioritize: v.optional(v.picklist(["cost", "speed", "quality", "coverage"])),
});

const OptimizeBody = v.object({
  orderDescription: v.optional(v.string()),
  lineItems: v.optional(v.array(LineItemSchema)),
  constraints: v.optional(ConstraintsSchema),
});

async function readJson(c: unknown): Promise<unknown> {
  try {
    return await (c as { req: { json(): Promise<unknown> } }).req.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /optimize — Run the sourcing optimizer
// ---------------------------------------------------------------------------

optimization.post(
  "/optimize",
  describeRoute({
    operationId: "optimizeSourcing",
    summary:
      "Analyze an order and return ranked multi-supplier fulfillment strategies with partial-fill support and LLM-powered reasoning",
    security: [{ bearerAuth: [] }, {}],
    responses: {
      200: {
        description:
          "Sourcing plan with ranked strategies, allocations, unfulfillable items, and natural-language explanation",
      },
      400: { description: "Invalid request body" },
      500: { description: "Internal server error" },
    },
  }),
  authMiddleware({ optional: true }),
  async (c) => {
    try {
      const raw = await readJson(c);
      const parsed = v.safeParse(OptimizeBody, raw);
      if (!parsed.success) {
        return c.json({ error: "Invalid request body", details: parsed.issues }, 400);
      }
      const body = parsed.output;

      if (!body.orderDescription && (!body.lineItems || body.lineItems.length === 0)) {
        return c.json({ error: "Provide either orderDescription or lineItems" }, 400);
      }

      const request: OptimizationRequest = {
        orderDescription: body.orderDescription,
        lineItems: body.lineItems?.map((li) => ({
          item: li.item,
          qtyNeeded: li.qtyNeeded,
          unit: li.unit ?? "kg",
          maxPricePerUnit: li.maxPricePerUnit,
          acceptSubstitutes: li.acceptSubstitutes,
          notes: li.notes,
        })),
        constraints: body.constraints
          ? {
              maxTotalBudget: body.constraints.maxTotalBudget,
              preferredDeliveryWindow: body.constraints.preferredDeliveryWindow,
              maxSuppliers: body.constraints.maxSuppliers,
              prioritize: body.constraints.prioritize,
            }
          : undefined,
      };

      const plan: SourcingPlan = await runSourcingOptimizer(request);
      return c.json(plan, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Optimization] Route error:", message);
      return c.json({ error: message }, 500);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /optimize/explain — Re-explain an existing plan (e.g. after user edits)
// ---------------------------------------------------------------------------

const ExplainBody = v.object({
  strategyId: v.pipe(v.string(), v.minLength(1)),
  context: v.optional(v.string()),
});

optimization.post(
  "/optimize/explain",
  describeRoute({
    operationId: "explainStrategy",
    summary:
      "Generate a natural-language explanation for a specific fulfillment strategy",
    security: [{ bearerAuth: [] }, {}],
    responses: {
      200: { description: "Explanation text" },
      400: { description: "Invalid request body" },
    },
  }),
  authMiddleware({ optional: true }),
  async (c) => {
    try {
      const raw = await readJson(c);
      const parsed = v.safeParse(ExplainBody, raw);
      if (!parsed.success) {
        return c.json({ error: "Invalid request body", details: parsed.issues }, 400);
      }

      return c.json({
        strategyId: parsed.output.strategyId,
        explanation:
          "To get a full explanation, run the /optimize endpoint which includes LLM-generated reasoning for all strategies.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

export default optimization;

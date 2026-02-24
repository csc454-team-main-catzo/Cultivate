import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import ProduceItem, { makeSlug, normalizeSynonym } from "../models/ProduceItem.js";
import {
  ProduceItemCreateSchema,
  type ProduceItemCreateInput,
  ProduceItemListResponseSchema,
  ProduceItemResponseSchema,
  ProduceItemSynonymsSchema,
  type ProduceItemSynonymsInput,
} from "../schemas/produce-item.js";

const produceItems = new Hono<AuthenticatedContext>();

function dedupeNormalizedSynonyms(input: string[]): string[] {
  return Array.from(
    new Set(
      input
        .map((entry) => normalizeSynonym(entry))
        .filter(Boolean)
    )
  );
}

produceItems.post(
  "/admin/produce-items",
  describeRoute({
    operationId: "upsertProduceItem",
    summary: "Admin upsert produce taxonomy item by canonical name",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated taxonomy item",
        content: { "application/json": { schema: resolver(ProduceItemResponseSchema) } },
      },
      201: {
        description: "Created taxonomy item",
        content: { "application/json": { schema: resolver(ProduceItemResponseSchema) } },
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
    },
  }),
  authMiddleware(),
  requireAdmin,
  validator("json", ProduceItemCreateSchema),
  async (c) => {
    const data = c.req.valid("json" as never) as ProduceItemCreateInput;
    const canonical = data.canonical.trim();
    const normalizedCanonical = canonical.toLowerCase();
    const createdBy = c.get("userId");
    const synonyms = dedupeNormalizedSynonyms(data.synonyms || []);

    const existing = await ProduceItem.findOne({
      $expr: { $eq: [{ $toLower: "$canonical" }, normalizedCanonical] },
    });

    if (existing) {
      existing.canonical = canonical;
      existing.name = makeSlug(canonical);
      existing.synonyms = dedupeNormalizedSynonyms([
        ...existing.synonyms,
        ...synonyms,
      ]);
      if (data.priority !== undefined) existing.priority = data.priority;
      if (data.active !== undefined) existing.active = data.active;
      await existing.save();
      return c.json(existing.toJSON(), 200);
    }

    const created = await ProduceItem.create({
      canonical,
      name: makeSlug(canonical),
      synonyms,
      priority: data.priority ?? 0,
      active: data.active ?? true,
      createdBy,
    });

    return c.json(created.toJSON(), 201);
  }
);

produceItems.post(
  "/admin/produce-items/:id/synonyms",
  describeRoute({
    operationId: "addProduceItemSynonyms",
    summary: "Admin add synonyms for produce taxonomy item",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Updated taxonomy item",
        content: { "application/json": { schema: resolver(ProduceItemResponseSchema) } },
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      404: { description: "Not found" },
    },
  }),
  authMiddleware(),
  requireAdmin,
  validator("json", ProduceItemSynonymsSchema),
  async (c) => {
    const { add } = c.req.valid("json" as never) as ProduceItemSynonymsInput;
    const produceItem = await ProduceItem.findById(c.req.param("id"));
    if (!produceItem) {
      return c.json({ error: "Produce item not found" }, 404);
    }

    produceItem.synonyms = dedupeNormalizedSynonyms([
      ...produceItem.synonyms,
      ...add,
    ]);
    await produceItem.save();

    return c.json(produceItem.toJSON(), 200);
  }
);

produceItems.get(
  "/produce-items",
  describeRoute({
    operationId: "listProduceItems",
    summary: "List produce taxonomy items for dropdown usage",
    responses: {
      200: {
        description: "List of taxonomy items",
        content: {
          "application/json": {
            schema: resolver(ProduceItemListResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const activeParam = c.req.query("active");
    const query = activeParam === "true" ? { active: true } : {};
    const docs = await ProduceItem.find(query).sort({ priority: -1, canonical: 1 });
    return c.json(docs.map((doc) => doc.toJSON()), 200);
  }
);

export default produceItems;

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { authMiddleware } from "../middleware/auth.js";
import Order from "../models/Order.js";
import ReceivingBrief from "../models/ReceivingBrief.js";
import { list_suppliers_with_trust } from "../mcp/tools.js";
import { runQualityGate } from "../agents/qualityGate/graph.js";
import { sendBriefEmail } from "../lib/email.js";
import { createDeliveryEventForOrder } from "../integrations/googleCalendar/deliveryEvent.js";
import CFG from "../config.js";

const orderLineItemSchema = z.object({
  itemCanonical: z.string().min(1).trim(),
  itemDisplayName: z.string().min(1).trim(),
  expectedQty: z.number().min(0),
  unit: z.enum(["kg", "lb", "count", "bunch", "case"]),
  packSize: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

const createOrderBodySchema = z.object({
  restaurantId: z.string().min(1),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryWindowStart: z.string(), // ISO date-time or "HH:mm" (use with orderDate for date)
  deliveryWindowEnd: z.string(),
  lineItems: z.array(orderLineItemSchema).min(1),
  supplierId: z.string().optional(),
  /** If set, run quality gate and email this address the receiving brief (with tracking when added at midday check-in). */
  recipientEmail: z.union([z.string().email(), z.literal("")]).optional(),
});

/**
 * Parse "HH:mm" as local time in DEFAULT_DELIVERY_TIMEZONE on the given date, return UTC Date.
 */
function parseLocalTimeToUTC(datePart: string, timeStr: string): Date {
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, m] = timeStr.trim().split(":");
  const hour = Math.min(23, Math.max(0, parseInt(h ?? "0", 10)));
  const min = Math.min(59, Math.max(0, parseInt(m ?? "0", 10)));
  const localDate = new Date(y, mo - 1, d, hour, min, 0, 0);
  return fromZonedTime(localDate, CFG.DEFAULT_DELIVERY_TIMEZONE);
}

function parseWindow(
  orderDate: string,
  start: string,
  end: string
): { deliveryWindowStart: Date; deliveryWindowEnd: Date } {
  const datePart = orderDate.slice(0, 10);
  let deliveryWindowStart: Date;
  let deliveryWindowEnd: Date;
  if (start.length <= 8 && start.includes(":") && end.length <= 8 && end.includes(":")) {
    deliveryWindowStart = parseLocalTimeToUTC(datePart, start);
    deliveryWindowEnd = parseLocalTimeToUTC(datePart, end);
  } else {
    deliveryWindowStart = new Date(start);
    deliveryWindowEnd = new Date(end);
  }
  if (isNaN(deliveryWindowStart.getTime()) || isNaN(deliveryWindowEnd.getTime())) {
    throw new Error("Invalid delivery window");
  }
  return { deliveryWindowStart, deliveryWindowEnd };
}

const ordersRoutes = new Hono();

ordersRoutes.post(
  "/orders",
  authMiddleware({ optional: true }),
  zValidator("json", createOrderBodySchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Invalid body", details: result.error.flatten() }, 400);
    }
  }),
  async (c) => {
    const body = c.req.valid("json");
    let supplierId = body.supplierId;
    if (!supplierId) {
      const suppliers = await list_suppliers_with_trust();
      if (suppliers.length === 0) {
        return c.json(
          { error: "No suppliers in the system. Add suppliers or provide supplierId." },
          400
        );
      }
      const best = suppliers.reduce((a, b) =>
        a.reliability >= b.reliability ? a : b
      );
      supplierId = best._id;
    }
    const { deliveryWindowStart, deliveryWindowEnd } = parseWindow(
      body.orderDate,
      body.deliveryWindowStart,
      body.deliveryWindowEnd
    );
    const orderDate = new Date(body.orderDate + "T12:00:00.000Z");
    const doc = await Order.create({
      restaurantId: body.restaurantId,
      orderDate,
      supplierId,
      lineItems: body.lineItems,
      deliveryWindowStart,
      deliveryWindowEnd,
      status: "placed",
    });

    let emailSent = false;
    type EmailSkippedReason = "no_recipient" | "no_brief" | "no_api_key" | "send_failed";
    let emailSkippedReason: EmailSkippedReason | undefined;
    const recipientEmail = body.recipientEmail?.trim();
    if (!recipientEmail) {
      console.info("[orders] No recipientEmail in request; brief email skipped.");
      emailSkippedReason = "no_recipient";
    }
    if (recipientEmail) {
      try {
        const dateStr = body.orderDate.slice(0, 10);
        await runQualityGate(body.restaurantId, dateStr);
        const start = new Date(dateStr + "T00:00:00.000Z");
        const end = new Date(dateStr + "T23:59:59.999Z");
        const brief = await ReceivingBrief.findOne({
          restaurantId: body.restaurantId,
          briefDate: { $gte: start, $lte: end },
        })
          .lean()
          .exec();
        if (!brief) {
          console.warn("[orders] No receiving brief found after quality gate; brief email skipped.", {
            restaurantId: body.restaurantId,
            dateStr,
          });
          emailSkippedReason = "no_brief";
        }
        if (brief) {
          const briefForEmail = {
            briefDate: brief.briefDate.toISOString().slice(0, 10),
            sections: brief.sections.map((s) => ({
              supplierName: s.supplierName,
              orderId: String(s.orderId),
              riskTier: s.riskTier,
              confirmationStatus: s.confirmationStatus,
              trackingStatus: s.trackingStatus ?? "",
              lineItems: s.lineItems.map((li) => ({
                itemDisplayName: li.itemDisplayName,
                expectedQty: li.expectedQty,
                unit: li.unit,
                packagingExpectation: li.packagingExpectation,
                quickQualityChecks: li.quickQualityChecks,
              })),
            })),
          };
          const emailResult = await sendBriefEmail(recipientEmail, briefForEmail);
          emailSent = emailResult.sent;
          if (!emailResult.sent && emailResult.reason) {
            emailSkippedReason = emailResult.reason === "no_api_key" ? "no_api_key" : "send_failed";
          }
        }
      } catch (e) {
        console.error("[orders] Brief email failed:", e);
        emailSkippedReason = "send_failed";
      }
    }

    let calendarEventCreated = false;
    let calendarEventUpdated = false;
    const userId = c.get("userId") as string | undefined;
    if (userId) {
      try {
        const calendarResult = await createDeliveryEventForOrder({
          userId: userId as any,
          orderId: doc._id,
        });
        calendarEventCreated = calendarResult.created;
        calendarEventUpdated = calendarResult.updated;
      } catch (e) {
        console.error("[orders] Google Calendar event creation failed:", (e as Error).message);
      }
    }

    return c.json(
      {
        _id: String(doc._id),
        restaurantId: String(doc.restaurantId),
        orderDate: doc.orderDate.toISOString(),
        supplierId: String(doc.supplierId),
        lineItems: doc.lineItems,
        deliveryWindowStart: doc.deliveryWindowStart.toISOString(),
        deliveryWindowEnd: doc.deliveryWindowEnd.toISOString(),
        status: doc.status,
        emailSent,
        ...(calendarEventCreated && { calendarEventCreated: true }),
        ...(calendarEventUpdated && { calendarEventUpdated: true }),
        ...(emailSkippedReason && { emailSkippedReason }),
      },
      201
    );
  }
);

export default ordersRoutes;

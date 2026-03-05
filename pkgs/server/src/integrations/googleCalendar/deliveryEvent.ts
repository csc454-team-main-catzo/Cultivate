/**
 * Create or update a Google Calendar event for a delivery order.
 * Idempotent: if order already has googleCalendarEventId, update that event if window changed; else create once.
 */

import type { Types } from "mongoose";
import Order from "../../models/Order.js";
import Supplier from "../../models/Supplier.js";
import { getValidAccessToken } from "./service.js";
import { createCalendarEvent, updateCalendarEvent } from "./service.js";
import type { CalendarEventInput } from "./googleApi.js";
import CFG from "../../config.js";

const TIMEZONE = "UTC";

function formatItemLine(item: {
  itemDisplayName: string;
  expectedQty: number;
  unit: string;
  packSize?: string;
  substitutionRules?: string;
}): string {
  let line = `${item.itemDisplayName} — ${item.expectedQty} ${item.unit}`;
  if (item.packSize) line += ` (${item.packSize})`;
  if (item.substitutionRules?.trim()) line += `, notes: ${item.substitutionRules.trim()}`;
  return line;
}

function buildDescription(params: {
  orderId: string;
  supplierName: string;
  restaurantId: string;
  lineItems: Array<{
    itemDisplayName: string;
    expectedQty: number;
    unit: string;
    packSize?: string;
    substitutionRules?: string;
  }>;
  briefUrl?: string;
}): string {
  const lines: string[] = [
    `Order ID: ${params.orderId}`,
    `Supplier: ${params.supplierName}`,
    `Restaurant ID: ${params.restaurantId}`,
    "",
    "Items:",
    ...params.lineItems.map(formatItemLine),
  ];
  if (params.briefUrl) {
    lines.push("", `Receiving brief: ${params.briefUrl}`);
  }
  return lines.join("\n");
}

/**
 * Create or update a delivery calendar event for the order.
 * - If order already has googleCalendarEventId: update that event if times changed.
 * - Otherwise create a new event and persist googleCalendarEventId + googleCalendarId on the order.
 * Returns true if an event was created or updated; false if skipped or no integration.
 */
export async function createDeliveryEventForOrder(params: {
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
}): Promise<{ created: boolean; updated: boolean; error?: string }> {
  const order = await Order.findById(params.orderId)
    .populate<{ supplierId: { name: string } }>("supplierId")
    .lean();
  if (!order) {
    return { created: false, updated: false, error: "order_not_found" };
  }
  if (!order.deliveryWindowStart || !order.deliveryWindowEnd) {
    return { created: false, updated: false, error: "no_delivery_window" };
  }

  const supplierName =
    (order.supplierId as unknown as { name?: string })?.name ?? "Supplier";
  const restaurantIdStr = String(order.restaurantId);
  const briefUrl = CFG.APP_BASE_URL
    ? `${CFG.APP_BASE_URL.replace(/\/$/, "")}/quality-gate?date=${(order.orderDate as Date).toISOString().slice(0, 10)}`
    : undefined;

  const startISO = new Date(order.deliveryWindowStart).toISOString();
  const endISO = new Date(order.deliveryWindowEnd).toISOString();
  const description = buildDescription({
    orderId: String(order._id),
    supplierName,
    restaurantId: restaurantIdStr,
    lineItems: order.lineItems.map((li) => ({
      itemDisplayName: li.itemDisplayName,
      expectedQty: li.expectedQty,
      unit: li.unit,
      packSize: li.packSize,
      substitutionRules: li.substitutionRules,
    })),
    briefUrl,
  });

  const eventPayload: CalendarEventInput = {
    summary: `Delivery: ${supplierName} → Restaurant`,
    description,
    location: `Restaurant (${restaurantIdStr})`,
    start: { dateTime: startISO, timeZone: TIMEZONE },
    end: { dateTime: endISO, timeZone: TIMEZONE },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
  };

  const tokenResult = await getValidAccessToken(params.userId);
  if (!tokenResult) {
    return { created: false, updated: false };
  }

  const { accessToken, calendarId } = tokenResult;

  // Idempotency: already have an event
  if (order.googleCalendarEventId && order.googleCalendarId) {
    const updated = await updateCalendarEvent(
      params.userId,
      calendarId,
      accessToken,
      order.googleCalendarEventId,
      {
        summary: eventPayload.summary,
        description: eventPayload.description,
        location: eventPayload.location,
        start: eventPayload.start,
        end: eventPayload.end,
      }
    );
    if (updated) {
      return { created: false, updated: true };
    }
    return { created: false, updated: false, error: "update_failed" };
  }

  const result = await createCalendarEvent(
    params.userId,
    calendarId,
    accessToken,
    eventPayload
  );
  if (!result) {
    return { created: false, updated: false, error: "create_failed" };
  }

  await Order.updateOne(
    { _id: params.orderId },
    {
      $set: {
        googleCalendarEventId: result.id,
        googleCalendarId: calendarId,
      },
    }
  );
  return { created: true, updated: false };
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeliveryEventForOrder } from "./deliveryEvent.js";
import Order from "../../models/Order.js";
import * as service from "./service.js";

vi.mock("../../models/Order.js", () => ({
  default: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("./service.js", () => ({
  getValidAccessToken: vi.fn(),
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
}));

const mockOrder = {
  _id: "order123",
  restaurantId: "rest456",
  supplierId: { name: "Test Supplier" },
  deliveryWindowStart: new Date("2025-03-05T14:00:00.000Z"),
  deliveryWindowEnd: new Date("2025-03-05T16:00:00.000Z"),
  orderDate: new Date("2025-03-05"),
  lineItems: [
    { itemDisplayName: "Tomatoes", expectedQty: 80, unit: "lb", packSize: "10 lb x 8", substitutionRules: "" },
  ],
  googleCalendarEventId: undefined as string | undefined,
  googleCalendarId: undefined as string | undefined,
};

function setupOrderMock(overrides: Partial<typeof mockOrder> = {}) {
  const order = { ...mockOrder, ...overrides };
  vi.mocked(Order.findById).mockReturnValue({
    populate: () => ({
      lean: () => Promise.resolve(order),
    }),
  } as any);
}

describe("createDeliveryEventForOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupOrderMock();
  });

  it("returns created: true when no existing event and token valid", async () => {
    vi.mocked(service.getValidAccessToken).mockResolvedValue({
      accessToken: "at",
      calendarId: "primary",
    });
    vi.mocked(service.createCalendarEvent).mockResolvedValue({ id: "evt1" });

    const result = await createDeliveryEventForOrder({
      userId: "user1" as any,
      orderId: "order123" as any,
    });

    expect(result.created).toBe(true);
    expect(result.updated).toBe(false);
    expect(service.createCalendarEvent).toHaveBeenCalledTimes(1);
    expect(Order.updateOne).toHaveBeenCalledWith(
      { _id: "order123" },
      { $set: { googleCalendarEventId: "evt1", googleCalendarId: "primary" } }
    );
  });

  it("does not create again when order already has googleCalendarEventId", async () => {
    setupOrderMock({ googleCalendarEventId: "evt1", googleCalendarId: "primary" });
    vi.mocked(service.getValidAccessToken).mockResolvedValue({
      accessToken: "at",
      calendarId: "primary",
    });
    vi.mocked(service.updateCalendarEvent).mockResolvedValue(true);

    const result = await createDeliveryEventForOrder({
      userId: "user1" as any,
      orderId: "order123" as any,
    });

    expect(result.created).toBe(false);
    expect(result.updated).toBe(true);
    expect(service.updateCalendarEvent).toHaveBeenCalledTimes(1);
    expect(service.createCalendarEvent).not.toHaveBeenCalled();
  });

  it("returns created: false when no valid token", async () => {
    vi.mocked(service.getValidAccessToken).mockResolvedValue(null);

    const result = await createDeliveryEventForOrder({
      userId: "user1" as any,
      orderId: "order123" as any,
    });

    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);
    expect(service.createCalendarEvent).not.toHaveBeenCalled();
  });

  it("returns error when order not found", async () => {
    vi.mocked(Order.findById).mockReturnValue({
      populate: () => ({
        lean: () => Promise.resolve(null),
      }),
    } as any);

    const result = await createDeliveryEventForOrder({
      userId: "user1" as any,
      orderId: "nonexistent" as any,
    });

    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);
    expect(result.error).toBe("order_not_found");
  });
});

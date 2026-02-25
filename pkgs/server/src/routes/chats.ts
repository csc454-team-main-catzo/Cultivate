import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import Listing, { type IResponse } from "../models/Listing.js";
import ChatThread, { type IChatThread } from "../models/ChatThread.js";

const chats = new Hono<AuthenticatedContext>();

type EnsureThreadBody = {
  listingId?: string;
  responseId?: string;
};

type CreateMessageBody = {
  text?: string;
};

chats.post("/threads/ensure", authMiddleware(), async (c) => {
  try {
    const body = (await c.req.json()) as EnsureThreadBody;
    const listingId = body.listingId;
    const responseId = body.responseId;

    if (!listingId || !responseId) {
      return c.json(
        { error: "listingId and responseId are required" },
        400
      );
    }

    const userId = c.get("userId");

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return c.json({ error: "Listing not found" }, 404);
    }

    const response = listing.responses.id(responseId) as IResponse | null;
    if (!response) {
      return c.json({ error: "Response not found" }, 404);
    }

    const isListingOwner = listing.createdBy.toString() === userId;
    const isResponseOwner = response.createdBy.toString() === userId;

    if (!isListingOwner && !isResponseOwner) {
      return c.json(
        { error: "You are not allowed to chat on this response" },
        403
      );
    }

    const participantIds = [
      listing.createdBy.toString(),
      response.createdBy.toString(),
    ].sort();

    let thread = await ChatThread.findOne({
      listing: listing._id,
      response: response._id,
    });

    if (!thread) {
      thread = await ChatThread.create({
        listing: listing._id,
        response: response._id,
        participants: participantIds,
      } as Partial<IChatThread>);
    }

    const populated = await ChatThread.findById(thread._id)
      .populate("participants", "name email role")
      .lean();

    return c.json(populated, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

chats.get("/threads", authMiddleware(), async (c) => {
  try {
    const userId = c.get("userId");

    const threads = await ChatThread.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "name email role")
      .populate({
        path: "listing",
        select: "title item price qty status createdBy",
        populate: {
          path: "createdBy",
          select: "name email role",
        },
      })
      .lean();

    return c.json(
      threads.map((t) => {
        const messages = (t.messages as any[]) || [];
        const lastMessage = messages[messages.length - 1] || null;
        return {
          _id: t._id,
          listing: t.listing,
          response: t.response,
          participants: t.participants,
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                sender: lastMessage.sender,
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
              }
            : null,
          updatedAt: t.updatedAt,
          createdAt: t.createdAt,
        };
      }),
      200
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

chats.get("/threads/:id", authMiddleware(), async (c) => {
  try {
    const threadId = c.req.param("id");
    const userId = c.get("userId");

    const thread = await ChatThread.findById(threadId)
      .populate("participants", "name email role")
      .lean();

    if (!thread) {
      return c.json({ error: "Chat thread not found" }, 404);
    }

    const isParticipant = (thread.participants as any[]).some(
      (p) => (p._id ?? p).toString() === userId
    );

    if (!isParticipant) {
      return c.json(
        { error: "You are not allowed to view this chat thread" },
        403
      );
    }

    return c.json(thread, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

chats.post("/threads/:id/messages", authMiddleware(), async (c) => {
  try {
    const threadId = c.req.param("id");
    const userId = c.get("userId");
    const body = (await c.req.json()) as CreateMessageBody;
    const text = body.text?.trim() ?? "";

    if (!text) {
      return c.json({ error: "Message text is required" }, 400);
    }

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return c.json({ error: "Chat thread not found" }, 404);
    }

    const isParticipant = thread.participants.some(
      (p: any) => p.toString() === userId
    );

    if (!isParticipant) {
      return c.json(
        { error: "You are not allowed to send messages in this chat thread" },
        403
      );
    }

    thread.messages.push({
      sender: userId as any,
      text,
    } as any);

    await thread.save();

    const lastMessage = thread.messages[thread.messages.length - 1];

    return c.json(
      {
        message: {
          _id: lastMessage._id.toString(),
          sender: lastMessage.sender.toString(),
          text: lastMessage.text,
          createdAt: lastMessage.createdAt,
        },
      },
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default chats;


import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChatMessage {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IChatThread extends Document {
  listing: Types.ObjectId;
  response: Types.ObjectId;
  participants: Types.ObjectId[];
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const ChatThreadSchema = new Schema<IChatThread>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing is required for a chat thread"],
    },
    response: {
      type: Schema.Types.ObjectId,
      required: [true, "Response is required for a chat thread"],
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Participant is required"],
      },
    ],
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ChatThreadSchema.index({ listing: 1, response: 1 }, { unique: true });
ChatThreadSchema.index({ participants: 1 });

const ChatThread =
  mongoose.models.ChatThread ||
  mongoose.model<IChatThread>("ChatThread", ChatThreadSchema);

export default ChatThread;
export { ChatMessageSchema };


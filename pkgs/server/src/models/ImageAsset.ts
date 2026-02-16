import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IImageAsset extends Document {
  owner: Types.ObjectId;
  gridFsFileId: Types.ObjectId;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const ImageAssetSchema = new Schema<IImageAsset>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
      index: true,
    },
    gridFsFileId: {
      type: Schema.Types.ObjectId,
      required: [true, "GridFS file id is required"],
      index: true,
    },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { timestamps: true }
);

const ImageAsset =
  mongoose.models.ImageAsset ||
  mongoose.model<IImageAsset>("ImageAsset", ImageAssetSchema);

export default ImageAsset;

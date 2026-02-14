import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import sharp from "sharp";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import ImageAsset from "../models/ImageAsset.js";
import { uploadBufferToGridFS } from "../services/gridfs.js";

const images = new Hono<AuthenticatedContext>();

images.post(
  "/images/upload",
  describeRoute({
    operationId: "uploadImage",
    summary: "Upload an image file and store in GridFS",
    security: [{ bearerAuth: [] }],
    responses: {
      201: { description: "Uploaded image metadata" },
      400: { description: "Invalid file" },
      401: { description: "Unauthorized" },
    },
  }),
  authMiddleware(),
  async (c) => {
    const formData = await c.req.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return c.json({ error: "Missing image file in form-data field 'image'" }, 400);
    }

    const originalBuffer = Buffer.from(await image.arrayBuffer());
    const processedBuffer = await sharp(originalBuffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const filename = `${Date.now()}-${image.name || "upload"}.jpg`;
    const fileId = await uploadBufferToGridFS(processedBuffer, filename, "image/jpeg");
    const owner = c.get("userId");

    const imageAsset = await ImageAsset.create({
      owner,
      gridFsFileId: fileId,
      filename,
      mimeType: "image/jpeg",
      size: processedBuffer.length,
    });

    return c.json(
      {
        imageId: imageAsset._id.toString(),
        filename: imageAsset.filename,
        mimeType: imageAsset.mimeType,
        size: imageAsset.size,
      },
      201
    );
  }
);

export default images;

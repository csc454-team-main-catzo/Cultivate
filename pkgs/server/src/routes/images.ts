import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import sharp from "sharp";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import ImageAsset from "../models/ImageAsset.js";
import { downloadBufferFromGridFS, uploadBufferToGridFS } from "../services/gridfs.js";
import { logJson } from "../utils/log.js";

const images = new Hono<AuthenticatedContext>();
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

images.get(
  "/images/:id",
  describeRoute({
    operationId: "getImageById",
    summary: "Serve stored produce image by id",
    responses: {
      200: { description: "Image binary" },
      404: { description: "Image not found" },
    },
  }),
  async (c) => {
    const imageAsset = await ImageAsset.findById(c.req.param("id"));
    if (!imageAsset) {
      return c.json({ error: "Image not found" }, 404);
    }

    try {
      const buffer = await downloadBufferFromGridFS(imageAsset.gridFsFileId.toString());
      c.header("Content-Type", imageAsset.mimeType || "image/jpeg");
      c.header("Cache-Control", "public, max-age=3600");
      return c.body(new Uint8Array(buffer));
    } catch {
      return c.json({ error: "Image not found" }, 404);
    }
  }
);

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
    const userId = c.get("userId");
    const formData = await c.req.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return c.json({ error: "Missing image file in form-data field 'image'" }, 400);
    }
    if (image.type && !SUPPORTED_MIME_TYPES.has(image.type)) {
      return c.json(
        { error: "Unsupported image format. Use JPEG, PNG, or WEBP." },
        415
      );
    }

    let processedBuffer: Buffer;
    let info: sharp.OutputInfo;
    try {
      const originalBuffer = Buffer.from(await image.arrayBuffer());
      const output = await sharp(originalBuffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      processedBuffer = output.data;
      info = output.info;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (
        message.includes("heif") ||
        message.includes("unsupported image format") ||
        message.includes("input file is missing") ||
        message.includes("bad seek")
      ) {
        return c.json(
          { error: "Unsupported image format. Use JPEG, PNG, or WEBP." },
          415
        );
      }
      return c.json({ error: "Failed to process image" }, 500);
    }

    const filename = `${Date.now()}-${image.name || "upload"}.jpg`;
    const fileId = await uploadBufferToGridFS(processedBuffer, filename, "image/jpeg");

    const imageAsset = await ImageAsset.create({
      owner: userId,
      gridFsFileId: fileId,
      filename,
      mimeType: "image/jpeg",
      size: processedBuffer.length,
      width: info.width ?? null,
      height: info.height ?? null,
    });

    logJson("image_upload", {
      userId,
      imageId: imageAsset._id.toString(),
      gridFsId: fileId.toString(),
      outMimeType: "image/jpeg",
      width: info.width ?? null,
      height: info.height ?? null,
      sizeBytes: processedBuffer.length,
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

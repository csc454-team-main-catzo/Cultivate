import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";

let gridfsBucket: GridFSBucket | null = null;

function getBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection is not ready");
  }

  if (!gridfsBucket) {
    gridfsBucket = new GridFSBucket(db, { bucketName: "images" });
  }

  return gridfsBucket;
}

export async function uploadBufferToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<ObjectId> {
  const bucket = getBucket();
  const fileId = new ObjectId();

  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStreamWithId(fileId, filename, {
      metadata: { contentType },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });

  return fileId;
}

export async function downloadBufferFromGridFS(fileId: string): Promise<Buffer> {
  const bucket = getBucket();
  const objectId = new ObjectId(fileId);
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openDownloadStream(objectId);
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  return Buffer.concat(chunks);
}

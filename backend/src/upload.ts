import fs from "node:fs";
import multer from "multer";
import type { RequestHandler } from "express";
import { MAX_UPLOAD_BYTES } from "./uploadValidation.js";

// Keep uploads in memory until their extension and content have both been validated.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

export const uploadSingleFile: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "File exceeds the 10 MB upload limit."
        : error.code === "LIMIT_UNEXPECTED_FILE"
          ? "Upload one file using the 'file' field."
          : "The file upload could not be accepted.";
      res.status(status).json({ error: message });
      return;
    }

    next(error);
  });
};

export const removeUploadedFile = async (filePath: string) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
};

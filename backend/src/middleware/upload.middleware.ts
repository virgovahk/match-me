import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_FOLDER = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER);
}

export const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_FOLDER);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });

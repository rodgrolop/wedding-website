const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Public endpoint. Given a content type, returns a short-lived presigned PUT
// URL so the guest's browser uploads the file DIRECTLY to the Space, into the
// private `pending/` prefix (nothing is public until it is approved).

const cors = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

const s3 = new S3Client({
  region: process.env.SPACES_REGION || "us-east-1",
  endpoint: process.env.SPACES_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

// Web functions receive JSON fields directly on args; fall back to __ow_body.
function readBody(args) {
  if (args.contentType || args.ext) return args;
  if (args.__ow_body) {
    try {
      return JSON.parse(Buffer.from(args.__ow_body, "base64").toString("utf8"));
    } catch {
      try {
        return JSON.parse(args.__ow_body);
      } catch {
        return {};
      }
    }
  }
  return {};
}

exports.main = async (args) => {
  if ((args.__ow_method || "").toLowerCase() === "options") {
    return { statusCode: 204, headers: cors(), body: "" };
  }
  const { contentType, ext } = readBody(args);
  if (!contentType || !String(contentType).startsWith("image/")) {
    return {
      statusCode: 400,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Solo se permiten imágenes" }),
    };
  }
  const safeExt =
    (ext || String(contentType).split("/")[1] || "jpg")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 5) || "jpg";
  const key = `pending/${crypto.randomUUID()}.${safeExt}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.SPACES_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "private",
  });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });

  return {
    statusCode: 200,
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify({ uploadUrl, key }),
  };
};

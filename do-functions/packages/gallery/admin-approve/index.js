const {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

// PROTECTED endpoint (x-admin-token header). Approves a photo from any state
// (pending/ or rejected/) by copying it to `approved/` with a public-read ACL
// (so the CDN serves it), then deleting the original. If the object is already
// under approved/ it just re-asserts the public ACL (no-op move).

const cors = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
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

function authed(args) {
  const h = args.__ow_headers || {};
  return (
    process.env.ADMIN_TOKEN && h["x-admin-token"] === process.env.ADMIN_TOKEN
  );
}

function readBody(args) {
  if (args.key) return args;
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
  if (!authed(args)) {
    return {
      statusCode: 401,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No autorizado" }),
    };
  }

  const { key } = readBody(args);
  if (!key || !/^(pending|rejected|approved)\//.test(String(key))) {
    return {
      statusCode: 400,
      headers: { ...cors(), "Content-Type": "application/json" },
      body: JSON.stringify({ error: "key inválida" }),
    };
  }
  const bucket = process.env.SPACES_BUCKET;
  const dest = key.replace(/^(pending|rejected|approved)\//, "approved/");

  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURIComponent(`${bucket}/${key}`),
      Key: dest,
      ACL: "public-read",
      MetadataDirective: "COPY",
    }),
  );
  if (dest !== key) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  return {
    statusCode: 200,
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify({
      approved: dest,
      url: `${process.env.CDN_BASE}/${dest}`,
    }),
  };
};

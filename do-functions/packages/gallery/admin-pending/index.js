const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// PROTECTED endpoint (x-admin-token header). Lists EVERY photo across the
// pending/, rejected/ and approved/ prefixes with short-lived presigned GET
// URLs so you can preview and act on any of them from the admin page. Each
// item carries a `state` derived from its prefix.

const cors = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  const bucket = process.env.SPACES_BUCKET;
  const PREFIXES = [
    { prefix: "pending/", state: "pending" },
    { prefix: "rejected/", state: "rejected" },
    { prefix: "approved/", state: "approved" },
  ];

  const lists = await Promise.all(
    PREFIXES.map(async ({ prefix, state }) => {
      const out = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
        }),
      );
      return Promise.all(
        (out.Contents || [])
          .filter((o) => o.Size > 0)
          .map(async (o) => ({
            key: o.Key,
            state,
            at: o.LastModified,
            url: await getSignedUrl(
              s3,
              new GetObjectCommand({ Bucket: bucket, Key: o.Key }),
              { expiresIn: 600 },
            ),
          })),
      );
    }),
  );

  // pending first, then rejected, then approved; newest first within a group
  const order = { pending: 0, rejected: 1, approved: 2 };
  const items = lists
    .flat()
    .sort(
      (a, b) =>
        order[a.state] - order[b.state] || new Date(b.at) - new Date(a.at),
    );

  return {
    statusCode: 200,
    headers: {
      ...cors(),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    // `items` is the new shape; `pending` kept for backward compatibility
    body: JSON.stringify({ items, pending: items }),
  };
};

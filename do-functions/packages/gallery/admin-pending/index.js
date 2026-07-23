const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// PROTECTED endpoint (x-admin-token header). Lists the PENDING photos with
// short-lived presigned GET URLs so you can preview them in an admin page
// before approving/rejecting. Pending objects are private, hence the signing.

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

  const out = await s3.send(
    new ListObjectsV2Command({
      Bucket: process.env.SPACES_BUCKET,
      Prefix: "pending/",
      MaxKeys: 1000,
    }),
  );
  const items = await Promise.all(
    (out.Contents || [])
      .filter((o) => o.Size > 0)
      .sort((a, b) => new Date(a.LastModified) - new Date(b.LastModified))
      .map(async (o) => ({
        key: o.Key,
        at: o.LastModified,
        url: await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.SPACES_BUCKET,
            Key: o.Key,
          }),
          { expiresIn: 600 },
        ),
      })),
  );

  return {
    statusCode: 200,
    headers: {
      ...cors(),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ pending: items }),
  };
};

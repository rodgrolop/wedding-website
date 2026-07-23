const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

// Public endpoint. Lists the APPROVED photos (served publicly via the CDN) so
// the gallery can poll it. Pending photos are never returned here.

const cors = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

exports.main = async (args) => {
  if ((args.__ow_method || "").toLowerCase() === "options") {
    return { statusCode: 204, headers: cors(), body: "" };
  }
  const base = process.env.CDN_BASE;
  const out = await s3.send(
    new ListObjectsV2Command({
      Bucket: process.env.SPACES_BUCKET,
      Prefix: "approved/",
      MaxKeys: 1000,
    }),
  );
  const photos = (out.Contents || [])
    .filter((o) => o.Size > 0)
    .map((o) => ({
      key: o.Key,
      url: `${base}/${o.Key}`,
      at: o.LastModified,
    }))
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    statusCode: 200,
    headers: {
      ...cors(),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ photos }),
  };
};

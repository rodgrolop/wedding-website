const {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Public endpoint. Called by the guest's browser right AFTER it finishes the
// presigned PUT (with the returned `key`). It runs AI moderation (Sightengine)
// on the pending object and decides:
//   - explicit/gore/weapon/offensive >= MOD_HIGH        -> auto-REJECT (-> rejected/, private)
//   - all scores < MOD_LOW and suggestive < MOD_SUGG    -> auto-APPROVE (-> approved/, public)
//   - anything in between                                -> left in pending/ for MANUAL review
// Rejected items are MOVED (not deleted) so a false positive can be recovered.

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

// Largest numeric value inside a Sightengine "classes" object.
function maxClasses(obj) {
  if (!obj || typeof obj !== "object") return 0;
  const nums = Object.values(obj).filter((n) => typeof n === "number");
  return nums.length ? Math.max(...nums) : 0;
}

async function json(status, obj) {
  return {
    statusCode: status,
    headers: { ...cors(), "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

async function moveTo(bucket, key, destPrefix, publicRead) {
  const dest = key.replace(/^pending\//, destPrefix);
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodeURIComponent(`${bucket}/${key}`),
      Key: dest,
      ACL: publicRead ? "public-read" : "private",
      MetadataDirective: "COPY",
    }),
  );
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return dest;
}

exports.main = async (args) => {
  if ((args.__ow_method || "").toLowerCase() === "options") {
    return { statusCode: 204, headers: cors(), body: "" };
  }

  const { key } = readBody(args);
  if (!key || !String(key).startsWith("pending/")) {
    return json(400, { error: "key inválida" });
  }
  const bucket = process.env.SPACES_BUCKET;

  // temporary public URL so Sightengine can fetch the private pending object
  const imageUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 },
  );

  const HIGH = parseFloat(process.env.MOD_HIGH || "0.8");
  const LOW = parseFloat(process.env.MOD_LOW || "0.4");
  const SUGG = parseFloat(process.env.MOD_SUGG || "0.8");

  // --- call Sightengine ---
  let data;
  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: "nudity-2.1,weapon,gore-2.0,offensive-2.0",
      api_user: process.env.SIGHTENGINE_USER,
      api_secret: process.env.SIGHTENGINE_SECRET,
    });
    const res = await fetch(
      `https://api.sightengine.com/1.0/check.json?${params.toString()}`,
    );
    data = await res.json();
  } catch (err) {
    // moderation service unreachable: fail safe -> leave for manual review
    return json(200, { decision: "manual", reason: "moderation_error" });
  }

  if (data.status !== "success") {
    return json(200, { decision: "manual", reason: "moderation_failed", data });
  }

  // --- extract scores (defensive across model versions) ---
  const nud = data.nudity || {};
  const explicit = Math.max(
    nud.sexual_activity || 0,
    nud.sexual_display || 0,
    nud.erotica || 0,
  );
  const suggestive = Math.max(nud.very_suggestive || 0, nud.suggestive || 0);
  const gore =
    (data.gore && (data.gore.prob ?? maxClasses(data.gore.classes))) || 0;
  const weapon =
    typeof data.weapon === "number"
      ? data.weapon
      : data.weapon
        ? maxClasses(data.weapon.classes)
        : 0;
  const offensive =
    (data.offensive &&
      (data.offensive.prob ?? maxClasses(data.offensive.classes))) ||
    0;

  const scores = { explicit, suggestive, gore, weapon, offensive };
  const worst = Math.max(explicit, gore, weapon, offensive);

  // --- 3-way decision ---
  if (worst >= HIGH) {
    const dest = await moveTo(bucket, key, "rejected/", false);
    return json(200, { decision: "rejected", key: dest, scores });
  }
  if (worst < LOW && suggestive < SUGG) {
    const dest = await moveTo(bucket, key, "approved/", true);
    return json(200, {
      decision: "approved",
      key: dest,
      url: `${process.env.CDN_BASE}/${dest}`,
      scores,
    });
  }
  // gray zone -> stays in pending/ for the human queue
  return json(200, { decision: "manual", scores });
};

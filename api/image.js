// Proxy gambar: menghindari blokir referrer/CORS dan memungkinkan tombol download.
module.exports = async (req, res) => {
  let target;
  try { target = new URL(String(req.query.url || "")); } catch { return res.status(400).end("URL tidak valid"); }

  const okHost = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(target.hostname);
  if (target.protocol !== "https:" || !okHost) return res.status(400).end("Host tidak diizinkan");

  try {
    const r = await fetch(target, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!r.ok) return res.status(502).end("Gagal mengambil gambar");
    const buf = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, s-maxage=86400, max-age=3600");
    if (req.query.download) {
      const name = String(req.query.name || "profile").replace(/[^a-z0-9._-]/gi, "");
      res.setHeader("Content-Disposition", `attachment; filename="${name}.jpg"`);
    }
    return res.status(200).send(buf);
  } catch {
    return res.status(500).end("Error");
  }
};

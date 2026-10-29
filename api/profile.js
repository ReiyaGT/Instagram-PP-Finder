const APP_ID = "936619743392459";
const WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MOBILE_UA = "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)";

function igHeaders(ua, session) {
  const h = { "user-agent": ua, "x-ig-app-id": APP_ID, accept: "*/*" };
  if (session) h.cookie = `sessionid=${session}`;
  return h;
}

module.exports = async (req, res) => {
  const username = String(req.query.username || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    return res.status(400).json({ error: "Username tidak valid." });
  }
  const session = process.env.IG_SESSIONID;

  try {
    const r = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      { headers: igHeaders(WEB_UA, session) }
    );
    if (r.status === 404) return res.status(404).json({ error: "Username tidak ditemukan." });
    if (!r.ok) {
      return res.status(502).json({
        error: `Instagram menolak permintaan (HTTP ${r.status}). Coba lagi nanti atau set IG_SESSIONID di Vercel.`,
      });
    }
    let j;
    try { j = await r.json(); } catch { j = null; }
    const u = j && j.data && j.data.user;
    if (!u) return res.status(404).json({ error: "Username tidak ditemukan." });

    let url = u.profile_pic_url_hd || u.profile_pic_url;
    let quality = "standard";
    let width = null, height = null;

    if (session) {
      try {
        const r2 = await fetch(`https://i.instagram.com/api/v1/users/${u.id}/info/`, {
          headers: igHeaders(MOBILE_UA, session),
        });
        if (r2.ok) {
          const j2 = await r2.json();
          const hd = j2 && j2.user && j2.user.hd_profile_pic_url_info;
          if (hd && hd.url) {
            url = hd.url; width = hd.width; height = hd.height; quality = "hd";
          }
        }
      } catch (_) { /* fallback ke versi standard */ }
    }

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    return res.status(200).json({
      username: u.username,
      fullName: u.full_name || "",
      isPrivate: !!u.is_private,
      isVerified: !!u.is_verified,
      url, quality, width, height,
    });
  } catch (e) {
    return res.status(500).json({ error: "Gagal menghubungi Instagram." });
  }
};

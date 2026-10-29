const APP_ID = "936619743392459";
const WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MOBILE_UA = "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)";

function cleanSession(s) {
  if (!s) return "";
  return s.trim().replace(/^sessionid=/i, "").replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

function igHeaders(ua, session, web) {
  const h = { "user-agent": ua, "x-ig-app-id": APP_ID, accept: "*/*", "accept-language": "en-US,en;q=0.9" };
  if (web) {
    h["x-requested-with"] = "XMLHttpRequest";
    h["x-ig-www-claim"] = "0";
    h.referer = "https://www.instagram.com/";
    h.origin = "https://www.instagram.com";
  }
  if (session) {
    h.cookie = `sessionid=${session}; csrftoken=x1y2z3; ig_did=00000000-0000-4000-8000-000000000000`;
    h["x-csrftoken"] = "x1y2z3";
  }
  return h;
}

async function getJson(url, headers) {
  const r = await fetch(url, { headers, redirect: "manual" });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: r.status, json, snippet: json ? (json.message || json.error_type || "") : text.slice(0, 80).replace(/\s+/g, " ") };
}

module.exports = async (req, res) => {
  const username = String(req.query.username || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    return res.status(400).json({ error: "Username tidak valid." });
  }
  const session = cleanSession(process.env.IG_SESSIONID);
  const q = `?username=${username}`;

  // Coba beberapa jalur untuk mendapatkan data user
  const attempts = [
    ["https://i.instagram.com/api/v1/users/web_profile_info/" + q, igHeaders(MOBILE_UA, session, false)],
    ["https://www.instagram.com/api/v1/users/web_profile_info/" + q, igHeaders(WEB_UA, session, true)],
    ["https://i.instagram.com/api/v1/users/web_profile_info/" + q, igHeaders(WEB_UA, session, true)],
  ];

  let user = null;
  const log = [];
  try {
    for (const [url, headers] of attempts) {
      const r = await getJson(url, headers);
      if (r.status === 404) return res.status(404).json({ error: "Username tidak ditemukan." });
      if (r.status === 200 && r.json && r.json.data && r.json.data.user) { user = r.json.data.user; break; }
      log.push(`${new URL(url).host}: ${r.status} ${r.snippet}`.trim());
    }
    if (!user) {
      return res.status(502).json({
        error: "Instagram menolak permintaan. " + (session ? "" : "IG_SESSIONID belum terbaca di server. ") + "Detail: " + log.join(" | "),
      });
    }

    let url = user.profile_pic_url_hd || user.profile_pic_url;
    let quality = "standard", width = null, height = null;

    if (session) {
      const r2 = await getJson(`https://i.instagram.com/api/v1/users/${user.id}/info/`, igHeaders(MOBILE_UA, session, false));
      const hd = r2.json && r2.json.user && r2.json.user.hd_profile_pic_url_info;
      if (hd && hd.url) { url = hd.url; width = hd.width; height = hd.height; quality = "hd"; }
    }

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    return res.status(200).json({
      username: user.username, fullName: user.full_name || "",
      isPrivate: !!user.is_private, isVerified: !!user.is_verified,
      url, quality, width, height,
    });
  } catch (e) {
    return res.status(500).json({ error: "Gagal menghubungi Instagram." });
  }
};

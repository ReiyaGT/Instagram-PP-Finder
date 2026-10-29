# Foto Profil Instagram HD

Cari foto profil Instagram resolusi tertinggi berdasarkan username. Frontend statis + 2 Vercel Serverless Function.

## Deploy
1. Push folder ini ke GitHub.
2. Di Vercel: Add New > Project > import repo (tanpa build command).
3. (Disarankan untuk resolusi penuh) Settings > Environment Variables:
   `IG_SESSIONID` = nilai cookie `sessionid` dari akun Instagram (gunakan akun cadangan).
4. Redeploy.

## Cara kerja
- `/api/profile?username=...` ambil data user, lalu (jika ada `IG_SESSIONID`) ambil `hd_profile_pic_url_info` dari endpoint info user (hingga 1080px). Tanpa sesi, hanya 320px.
- `/api/image?url=...` proxy gambar (hanya host cdninstagram/fbcdn) untuk tampil & download.

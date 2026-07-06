const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ANI_API = "https://tiktok-anime-api.vercel.app/kshitiz?keyword=";
const CACHE_DIR = path.join(process.cwd(), "cache");

module.exports = {
  config: {
    name: "anisearch",
    aliases: ["anime", "ani"],
    version: "2.3",
    author: "Rocky Chowdhury",
    countDown: 5,
    role: 0,
    category: "media",
    guide: {
      en: "{pn} [anime name]\nExample: .anisearch naruto"
    }
  },

  onStart: async function ({ message, args, event, api }) {
    if (!args[0]) {
      return message.reply(
        "🎌 𝗔𝗻𝗶𝗺𝗲 𝗦𝗲𝗮𝗿𝗰𝗵\n\n" +
        "Usage: .anisearch [anime name]\n\n" +
        "• .anisearch naruto\n" +
        "• .anisearch one piece\n" +
        "• .anisearch demon slayer\n\n" +
        "🌸 Rocky Chowdhury"
      );
    }

    const query = args.join(" ").trim();

    try {
      api.setMessageReaction("🐤", event.messageID, () => {}, true);

      // ✅ Always append "anime" so only anime videos are returned
      const searchQuery = query.toLowerCase().includes("anime") ? query : query + " anime";
      const apiRes = await axios.get(ANI_API + encodeURIComponent(searchQuery), {
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      // ✅ API returns ARRAY — take first item
      const raw = apiRes.data;
      const data = Array.isArray(raw) ? raw[0] : raw;

      if (!data) {
        api.setMessageReaction("❎", event.messageID, () => {}, true);
        return message.reply(`❌ "${query}" এর জন্য কোনো result পাওয়া যায়নি।\n\n🌸 Rocky Chowdhury`);
      }

      const videoUrl =
        data.videoUrl ||
        data.video ||
        data.video_url ||
        data.play ||
        data.playAddr ||
        data.hdplay ||
        data.wmplay ||
        null;

      if (!videoUrl) {
        api.setMessageReaction("❎", event.messageID, () => {}, true);
        return message.reply(
          `❌ Video URL পাওয়া যায়নি।\n\nFields: ${Object.keys(data).join(", ")}\n\n🌸 Rocky Chowdhury`
        );
      }

      const title  = data.title || data.desc || data.caption || data.description || query;
      const author = data.author || data.creator || data.nickname || data.username || "Unknown";
      const likes  = data.likes || data.digg_count || data.like_count || data.likeCount || 0;
      const views  = data.views || data.play_count || data.view_count || data.viewCount || 0;

      // Download video
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      const filePath = path.join(CACHE_DIR, `ani_${Date.now()}.mp4`);

      const videoRes = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "arraybuffer",
        timeout: 60000,
        maxRedirects: 10,
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
          "Accept": "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
          "Referer": "https://www.tiktok.com/",
          "Range": "bytes=0-",
          "Connection": "keep-alive"
        }
      });

      const buffer = Buffer.from(videoRes.data);
      if (!buffer || buffer.length < 500) {
        throw new Error(`Download failed — size: ${buffer?.length || 0} bytes`);
      }

      fs.writeFileSync(filePath, buffer);
      api.setMessageReaction("🪽", event.messageID, () => {}, true);

      const caption =
        `🎌 𝗔𝗻𝗶𝗺𝗲: ${query.toUpperCase()}\n\n` +
        `📝 ${String(title).substring(0, 80)}${title.length > 80 ? "..." : ""}\n` +
        `👤 Creator: ${author}\n` +
        `❤️ Likes: ${Number(likes).toLocaleString()}\n` +
        `👁️ Views: ${Number(views).toLocaleString()}\n\n` +
        `🌸 Rocky Chowdhury`;

      return message.reply(
        { body: caption, attachment: fs.createReadStream(filePath) },
        () => { try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {} }
      );

    } catch (err) {
      console.error("Anisearch Error:", err.message);
      api.setMessageReaction("❎", event.messageID, () => {}, true);
      const detail = err.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 150)}`
        : err.message;
      return message.reply(`❌ Error: ${detail}\n\n🌸 Rocky Chowdhury`);
    }
  }
};

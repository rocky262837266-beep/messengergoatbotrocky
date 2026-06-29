const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://rockystore-api-ym9s.vercel.app";

module.exports = {
  config: {
    name: "gs",
    version: "2.0.0",
    author: "Rocky Chowdhury",
    shortDescription: "Rocky Store - GoatBot Script Manager",
    longDescription: "Rocky Store থেকে GoatBot commands ও events install, upload, search, like, delete করো।",
    category: "System",
    guide: {
      en: [
        "  {pn}gs <id | name>          — ID বা নাম দিয়ে script খোঁজো",
        "  {pn}gs n                    — নতুন scripts দেখো",
        "  {pn}gs list [page]          — সব commands দেখো",
        "  {pn}gs list event [page]    — সব events দেখো",
        "  {pn}gs install <id>         — command install করো",
        "  {pn}gs event install <id>   — event install করো",
        "  {pn}gs like <id>            — script like করো",
        "  {pn}gs trending             — trending scripts দেখো",
        "  {pn}gs upload <fileName>    — command upload করো (scripts/cmds ফোল্ডার থেকে)",
        "  {pn}gs upload event <fn>    — event upload করো (scripts/events ফোল্ডার থেকে)",
        "  {pn}gs sync                 — সব installed scripts sync করো",
        "  {pn}gs delete <id> <secret> — script delete করো",
      ].join("\n"),
    },
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID } = event;
    const sub = args[0]?.toLowerCase();

    // ── help ──
    if (!sub || sub === "help") {
      return message.reply(
        "╔══ 🛒 Rocky Store ══╗\n" +
        "• !gs <id | name>\n" +
        "• !gs n\n" +
        "• !gs list [page]\n" +
        "• !gs list event [page]\n" +
        "• !gs install <id>\n" +
        "• !gs event install <id>\n" +
        "• !gs like <id>\n" +
        "• !gs trending\n" +
        "• !gs upload <fileName>\n" +
        "• !gs upload event <fileName>\n" +
        "• !gs sync\n" +
        "• !gs delete <id> <secret>\n" +
        "╚═══════════════════╝"
      );
    }

    // ── !gs n ──
    if (sub === "n") {
      try {
        const { data } = await axios.get(`${BASE_URL}/rockystore/list?limit=5`);
        if (!data.commands?.length) return message.reply("❌ কোনো script নেই।");
        const lines = data.commands.map((c, i) =>
          `${i + 1}. [${c.id}] ${c.name} v${c.version}\n   👤 ${c.author} | 📦 ${c.type}`
        );
        return message.reply("🆕 নতুন Scripts:\n\n" + lines.join("\n\n"));
      } catch (e) {
        return message.reply("❌ Error: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs list [event] [page] ──
    if (sub === "list") {
      let isEvent = false;
      let pageArg = args[1];
      if (args[1]?.toLowerCase() === "event") { isEvent = true; pageArg = args[2]; }
      const page = Math.max(1, parseInt(pageArg) || 1);
      const limit = 8;
      const offset = (page - 1) * limit;
      const typeFilter = isEvent ? "goat-event" : "goat-command";
      try {
        const { data } = await axios.get(`${BASE_URL}/rockystore/list?limit=${limit}&offset=${offset}&type=${typeFilter}`);
        if (!data.commands?.length) return message.reply(`❌ ${isEvent ? "Event" : "Command"} পাওয়া যায়নি।`);
        const totalPages = Math.ceil(data.total / limit);
        const lines = data.commands.map(c =>
          `[${c.id}] ${c.name} v${c.version}\n   👤 ${c.author} | ❤️ ${c.likes} | 📥 ${c.installs}`
        );
        return message.reply(
          `📋 ${isEvent ? "Events" : "Commands"} (পৃষ্ঠা ${page}/${totalPages}):\n\n` +
          lines.join("\n\n") + `\n\n🔢 মোট: ${data.total}`
        );
      } catch (e) {
        return message.reply("❌ Error: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs trending ──
    if (sub === "trending") {
      try {
        const { data } = await axios.get(`${BASE_URL}/rockystore/trending?limit=7`);
        if (!data?.length) return message.reply("❌ কোনো trending script নেই।");
        const lines = data.map((c, i) =>
          `${i + 1}. [${c.id}] ${c.name}\n   ❤️ ${c.likes} | 👁️ ${c.views} | 📥 ${c.installs}`
        );
        return message.reply("🔥 Trending Scripts:\n\n" + lines.join("\n\n"));
      } catch (e) {
        return message.reply("❌ Error: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs like <id> ──
    if (sub === "like") {
      const id = args[1];
      if (!id) return message.reply("❌ ব্যবহার: !gs like <id>");
      try {
        const { data } = await axios.post(`${BASE_URL}/rockystore/like/${id}`, { userID: String(senderID) });
        if (data.message) return message.reply(`ℹ️ ${data.message}`);
        return message.reply(`❤️ Like দেওয়া হয়েছে! মোট: ${data.likes}`);
      } catch (e) {
        return message.reply("❌ Error: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs install <id> ──
    if (sub === "install") {
      const id = args[1];
      if (!id) return message.reply("❌ ব্যবহার: !gs install <id>");
      return installScript({ id, isEvent: false, message, BASE_URL });
    }

    // ── !gs event install <id> ──
    if (sub === "event" && args[1]?.toLowerCase() === "install") {
      const id = args[2];
      if (!id) return message.reply("❌ ব্যবহার: !gs event install <id>");
      return installScript({ id, isEvent: true, message, BASE_URL });
    }

    // ── !gs delete <id> <secret> ──
    if (sub === "delete") {
      const id = args[1];
      const secret = args[2];
      if (!id || !secret) return message.reply("❌ ব্যবহার: !gs delete <id> <secret>");
      try {
        const { data } = await axios.post(`${BASE_URL}/rockystore/delete/${id}`, { secret });
        return message.reply(`✅ Script [${data.deleted}] মুছে ফেলা হয়েছে।`);
      } catch (e) {
        return message.reply("❌ Error: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs upload <fileName> বা !gs upload event <fileName> ──
    if (sub === "upload") {
      let isEvent = false;
      let fileName = args[1];
      if (args[1]?.toLowerCase() === "event") { isEvent = true; fileName = args[2]; }
      if (!fileName) return message.reply("❌ ব্যবহার: !gs upload <fileName>");

      if (!fileName.endsWith(".js")) fileName += ".js";

      const scriptDir = isEvent
        ? path.join(__dirname, "scripts", "events")
        : path.join(__dirname, "scripts", "cmds");
      const filePath = path.join(scriptDir, fileName);

      if (!fs.existsSync(filePath))
        return message.reply(`❌ ফাইল পাওয়া যায়নি:\n${filePath}\n\nনিশ্চিত করো ফাইলটা scripts/${isEvent ? "events" : "cmds"} ফোল্ডারে আছে।`);

      // ফাইল পড়ো
      let code;
      try { code = fs.readFileSync(filePath, "utf8"); }
      catch (e) { return message.reply("❌ ফাইল পড়তে পারছি না: " + e.message); }

      // name extract করো
      const nameMatch = code.match(/name\s*:\s*["'`](.*?)["'`]/);
      const scriptName = nameMatch?.[1] || fileName.replace(".js", "");

      // GitHub raw URL বানানোর চেষ্টা করো
      // User কে জিজ্ঞেস করো GitHub raw URL দিতে
      return message.reply(
        `📁 ফাইল পাওয়া গেছে: ${fileName}\n` +
        `📝 Script name: ${scriptName}\n\n` +
        `⚠️ Upload করতে GitHub Raw URL দরকার।\n\n` +
        `GitHub এ ফাইলটা upload করো, তারপর:\n` +
        `!gs uploadurl <rawUrl>${isEvent ? " event" : ""}`
      );
    }

    // ── !gs uploadurl <rawUrl> [event] ──
    if (sub === "uploadurl") {
      const rawUrl = args[1];
      const kind = args[2]?.toLowerCase() === "event" ? "event" : "command";
      if (!rawUrl) return message.reply("❌ ব্যবহার: !gs uploadurl <rawUrl> [event]");

      try {
        await message.reply("⏳ Uploading...");
        const { data } = await axios.post(`${BASE_URL}/rockystore/upload`, {
          rawUrl,
          framework: "goat",
          kind,
        });
        return message.reply(
          `✅ Upload সফল!\n\n` +
          `📦 ID: ${data.id}\n` +
          `📝 Name: ${data.name}\n` +
          `🏷️ Type: ${data.type}\n` +
          `👤 Author: ${data.author}\n` +
          `🔢 Version: ${data.version}\n` +
          `📁 Category: ${data.category}`
        );
      } catch (e) {
        return message.reply("❌ Upload failed: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs sync ──
    if (sub === "sync") {
      try {
        await message.reply("🔄 Syncing...");
        const { data } = await axios.get(`${BASE_URL}/rockystore/list?limit=50`);
        return message.reply(
          `✅ Sync সম্পন্ন!\n📦 মোট scripts: ${data.total}\n🕐 ${new Date().toLocaleString()}`
        );
      } catch (e) {
        return message.reply("❌ Sync failed: " + (e.response?.data?.error || e.message));
      }
    }

    // ── !gs <id বা name> — search ──
    const query = args.join(" ");
    try {
      const { data } = await axios.get(`${BASE_URL}/rockystore/search?q=${encodeURIComponent(query)}`);
      if (data.id) {
        return message.reply(
          `🔍 পাওয়া গেছে:\n\n` +
          `📦 ID: ${data.id}\n` +
          `📝 ${data.name} v${data.version}\n` +
          `👤 ${data.author} | 📁 ${data.category}\n` +
          `🏷️ ${data.type}\n` +
          `📖 ${data.description || "বিবরণ নেই"}\n` +
          `❤️ ${data.likes} | 👁️ ${data.views} | 📥 ${data.installs}\n\n` +
          `📥 Install: !gs install ${data.id}`
        );
      }
      if (data.commands?.length) {
        const lines = data.commands.map(c =>
          `[${c.id}] ${c.name} v${c.version} — 👤 ${c.author}`
        );
        return message.reply(
          `🔍 "${query}" (${data.total} results):\n\n` +
          lines.join("\n") +
          `\n\n📥 Install: !gs install <id>`
        );
      }
      return message.reply(`❌ "${query}" পাওয়া যায়নি।`);
    } catch (e) {
      return message.reply("❌ Error: " + (e.response?.data?.error || e.message));
    }
  },
};

async function installScript({ id, isEvent, message, BASE_URL }) {
  try {
    await message.reply(`⏳ [${id}] install হচ্ছে...`);

    const { data: info } = await axios.get(`${BASE_URL}/rockystore/search?q=${id}`);
    if (!info?.id) return message.reply(`❌ ID [${id}] পাওয়া যায়নি।`);
    if (!info.rawUrl) return message.reply(`❌ rawUrl নেই।`);

    const { data: code } = await axios.get(info.rawUrl, {
      responseType: "text",
      transformResponse: [(d) => d],
    });

    const scriptDir = isEvent
      ? path.join(__dirname, "scripts", "events")
      : path.join(__dirname, "scripts", "cmds");

    if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });

    const fileName = `${info.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.js`;
    fs.writeFileSync(path.join(scriptDir, fileName), code, "utf8");

    await axios.post(`${BASE_URL}/rockystore/install/${id}`);

    return message.reply(
      `✅ Install সফল!\n\n` +
      `📦 ${info.name} v${info.version}\n` +
      `👤 ${info.author}\n` +
      `💾 ${fileName}\n\n` +
      `♻️ Bot restart করলে active হবে।`
    );
  } catch (e) {
    return message.reply("❌ Install failed: " + (e.response?.data?.error || e.message));
  }
}

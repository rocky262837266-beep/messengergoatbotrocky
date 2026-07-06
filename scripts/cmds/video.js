const axios = require("axios");
const fs = require('fs');
const path = require('path');

const baseApiUrl = async () => {
    const base = await axios.get(`https://raw.githubusercontent.com/Rocky-mastermind/rocky-music-api/main/baseApiUrl.json`);
    return base.data.rocky; 
};

/**
* @author Rocky
* @description do not delete or change the author name
*/

module.exports = {
    config: {
        name: "video",
        version: "1.8",
        author: "Rocky",
        countDown: 10,
        category: "media",
        guide: { en: "{pn} <song name or link>" }
    },

    onStart: async ({ api, args, event }) => {
        const obfuscatedAuthor = String.fromCharCode(82, 111, 99, 107, 121); // "Rocky"
        if (module.exports.config.author !== obfuscatedAuthor) {
            return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
        }
        
        const { threadID, messageID } = event;
        if (!args[0]) return api.sendMessage(
            "❌ Baby, Please provide a music name.\n\nExample: .video lofi chill beats",
            threadID, messageID
        );

        try { api.setMessageReaction("🎵", messageID, () => {}, true); } catch (e) {}

        const keyWord = args.join(" ");

        try {
            const apiUrl = await baseApiUrl();

            // Search music from Rocky API
            const searchRes = await axios.get(
                `${apiUrl}/api/rocky?keyword=${encodeURIComponent(keyWord)}`,
                { timeout: 15000 }
            );

            const results = searchRes.data;

            if (!results || !Array.isArray(results) || results.length === 0) {
                try { api.setMessageReaction("🥹", messageID, () => {}, true); } catch (e) {}
                return api.sendMessage("❌ No music found for: " + keyWord, threadID, messageID);
            }

            const music = results[0];
            const downloadLink = music.hdMusicUrl || music.musicUrl;
            const title = music.title || keyWord;

            if (!downloadLink) {
                try { api.setMessageReaction("🥹", messageID, () => {}, true); } catch (e) {}
                return api.sendMessage("❌ Could not get download link.", threadID, messageID);
            }

            // Download the video/music file
            const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const filePath = path.join(__dirname, `rocky_${safeTitle}_${Date.now()}.mp4`);

            const fileBuffer = (await axios.get(downloadLink, {
                responseType: "arraybuffer",
                timeout: 30000
            })).data;

            fs.writeFileSync(filePath, Buffer.from(fileBuffer));

            await api.sendMessage({
                body: `🎵 𝙃𝙚𝙧𝙚'𝙨 𝙮𝙤𝙪𝙧 𝙢𝙪𝙨𝙞𝙘 𝙗𝙖𝙗𝙮 🎶\n\n• 𝐓𝐢𝐭𝐥𝐞: ${title}\n• 𝐀𝐮𝐭𝐡𝐨𝐫: Rocky`,
                attachment: fs.createReadStream(filePath)
            }, threadID, (err) => {
                if (!err) {
                    try { api.setMessageReaction("🪽", messageID, () => {}, true); } catch (e) {}
                }
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, messageID);

        } catch (e) {
            console.error("[Rocky Video Error]", e.message);
            try { api.setMessageReaction("🥹", messageID, () => {}, true); } catch (err) {}
            return api.sendMessage(
                "❌ Error: " + (e.message || "Something went wrong") + "\n\nTry again with a different keyword.",
                threadID, messageID
            );
        }
    }
};

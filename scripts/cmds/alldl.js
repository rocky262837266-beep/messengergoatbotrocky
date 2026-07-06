const axios = require("axios");

const API_BASE = "https://rocky-alldl-api.onrender.com/alldl";

const AUTHOR_CODE = [82,111,99,107,121,32,67,104,111,119,100,104,117,114,121];
const AUTHOR = String.fromCharCode.apply(null, AUTHOR_CODE);

function isAuthorIntact() {
  try {
    return module.exports.config.author === AUTHOR &&
      String.fromCharCode.apply(null, AUTHOR_CODE) === "Rocky Chowdhury";
  } catch (e) {
    return false;
  }
}

module.exports = {
  config: {
    name: "alldl",
    version: "1.0",
    author: AUTHOR,
    countDown: 10,
    role: 0,
    category: "media",
    shortDescription: {
      en: "Download video from YouTube/Facebook/TikTok/Instagram"
    },
    longDescription: {
      en: "Send a YouTube, Facebook, TikTok or Instagram link and get the video downloaded"
    },
    guide: {
      en: "{pn} <link>\nExample: {pn} https://www.tiktok.com/@user/video/123"
    }
  },

  onStart: async function (obj) {
    var api = obj.api;
    var event = obj.event;
    var args = obj.args;
    var threadID = event.threadID;
    var messageID = event.messageID;

    if (!isAuthorIntact()) {
      return api.sendMessage(
        "This command's credit has been modified without permission. Command disabled.\nOriginal author: Rocky Chowdhury",
        threadID,
        messageID
      );
    }

    var link = args[0];

    if (!link) {
      return api.sendMessage("Link den please.\nExample: alldl <video link>", threadID, messageID);
    }

    api.setMessageReaction("💫", messageID, function () {}, true);

    api.sendMessage("💫 Hold tight, your video is on its way...", threadID, function (err, waitInfo) {
      var waitMessageID = waitInfo && waitInfo.messageID;

      axios.get(API_BASE, {
        params: { url: link },
        timeout: 60000
      })
        .then(function (res) {
          var data = res.data;

          var videoUrl =
            (data && data.url) ||
            (data && data.video_url) ||
            (data && data.download_url) ||
            (data && data.data && data.data.url) ||
            (data && data.data && data.data.video) ||
            (data && data.medias && data.medias[0] && data.medias[0].url) ||
            (data && data.result && data.result.url);

          // ✅ Fixed: || operators were missing
          var title =
            (data && data.title) ||
            (data && data.data && data.data.title) ||
            "";

          if (!videoUrl) {
            console.log("ALLDL_RAW_RESPONSE:", JSON.stringify(data));
            return api.sendMessage(
              "Couldn't extract the video link. Check console for raw API response.",
              threadID,
              messageID
            );
          }

          global.utils.getStreamFromURL(videoUrl).then(function (stream) {
            var caption = "Rocky Chowdhury\n🕊️ Delivered safe and sound — enjoy the show!";
            if (title) caption = caption + "\n\n" + title;

            api.sendMessage(
              {
                body: caption,
                attachment: stream
              },
              threadID,
              function () {
                if (waitMessageID) api.unsendMessage(waitMessageID);
                api.setMessageReaction("🕊️", messageID, function () {}, true);
              },
              messageID
            );
          });
        })
        .catch(function (e) {
          console.log("ALLDL_ERROR:", e.message);
          api.sendMessage("Error: " + e.message, threadID, messageID);
        });
    }, messageID);
  }
};

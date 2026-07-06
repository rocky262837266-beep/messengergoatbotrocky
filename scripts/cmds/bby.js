const axios = require("axios");

const hinataWords = [
    "hinata", "hina", "baby", "bby", "babu", "bbu",
    "jan", "bot", "জান", "জানু", "বেবি", "wifey",
];

// ✅ Fixed: API has no .rocky field — use static URL directly
const BASE_URL = "https://hinata-api-2e1t.vercel.app";

module.exports.config = {
    name: "hinata",
    aliases: ["hina", "baby", "bby", "bbu", "jan", "janu", "wifey", "bot"],
    version: "1.0",
    author: "Rocky",
    countDown: 0,
    role: 0,
    description: "Hinata AI — chat, teach, edit, remove & more!",
    category: "chat",
    guide: {
        en:
            "{pn} [anyMessage] OR\n" +
            "teach [YourMessage] - [Reply1], [Reply2],... OR\n" +
            "remove [YourMessage] - [indexNumber] OR\n" +
            "msg [YourMessage] OR\n" +
            "list OR\n" +
            "list all OR\n" +
            "edit [YourMessage] - [NewMessage]"
    }
};

module.exports.onStart = async ({ api, event, args, usersData }) => {
    const msg = args.join(" ").toLowerCase();
    const uid = event.senderID;

    try {
        if (!args[0]) {
            const ran = [
                "Bolo Hinata কি বলবে? 🌸",
                "আমি এখানে আছি! বলো কি চাও 🌸",
                "type !hinata hi"
            ];
            return api.sendMessage(
                ran[Math.floor(Math.random() * ran.length)],
                event.threadID,
                event.messageID
            );
        }

        // ── TEACH ──────────────────────────────────────────────────
        if (args[0] === "teach") {
            const str = msg.replace("teach ", "");
            const [trigger, ...responsesArr] = str.split(" - ");
            const responses = responsesArr.join(" - ");
            if (!trigger || !responses)
                return api.sendMessage(
                    "❌ | teach [question] - [response1, response2,...]",
                    event.threadID,
                    event.messageID
                );
            const response = await axios.post(`${BASE_URL}/api/jan/teach`, {
                trigger,
                responses,
                userID: uid
            });
            const userName = (await usersData.getName(uid)) || "Unknown User";
            return api.sendMessage(
                `✅ Replies added: "${responses}" to "${trigger}"\n• 𝐓𝐞𝐚𝐜𝐡𝐞𝐫: ${userName}\n• 𝐓𝐨𝐭𝐚𝐥: ${response.data.count || 0}`,
                event.threadID,
                event.messageID
            );
        }

        // ── REMOVE ─────────────────────────────────────────────────
        if (args[0] === "remove") {
            const str = msg.replace("remove ", "");
            const [trigger, index] = str.split(" - ");
            if (!trigger || !index || isNaN(index))
                return api.sendMessage(
                    "❌ | remove [question] - [index]",
                    event.threadID,
                    event.messageID
                );
            const response = await axios.delete(`${BASE_URL}/api/jan/remove`, {
                data: { trigger, index: parseInt(index, 10) }
            });
            return api.sendMessage(
                response.data.message,
                event.threadID,
                event.messageID
            );
        }

        // ── LIST ───────────────────────────────────────────────────
        if (args[0] === "list") {
            const endpoint = args[1] === "all" ? "/list/all" : "/list";
            const response = await axios.get(`${BASE_URL}/api/jan${endpoint}`);
            if (args[1] === "all") {
                let message = "👑 List of Hinata teachers:\n\n";
                const data = Object.entries(response.data.data)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 100);
                for (let i = 0; i < data.length; i++) {
                    const [userID, count] = data[i];
                    const name = (await usersData.getName(userID)) || "Unknown";
                    message += `${i + 1}. ${name}: ${count}\n`;
                }
                return api.sendMessage(message, event.threadID, event.messageID);
            }
            return api.sendMessage(
                response.data.message,
                event.threadID,
                event.messageID
            );
        }

        // ── EDIT ───────────────────────────────────────────────────
        if (args[0] === "edit") {
            const str = msg.replace("edit ", "");
            const [oldTrigger, ...newArr] = str.split(" - ");
            const newResponse = newArr.join(" - ");
            if (!oldTrigger || !newResponse)
                return api.sendMessage(
                    "❌ | Format: edit [question] - [newResponse]",
                    event.threadID,
                    event.messageID
                );
            await axios.put(`${BASE_URL}/api/jan/edit`, { oldTrigger, newResponse });
            return api.sendMessage(
                `✅ Edited "${oldTrigger}" to "${newResponse}"`,
                event.threadID,
                event.messageID
            );
        }

        // ── MSG / SEARCH ───────────────────────────────────────────
        if (args[0] === "msg") {
            const searchTrigger = args.slice(1).join(" ");
            if (!searchTrigger)
                return api.sendMessage(
                    "Please provide a message to search.",
                    event.threadID,
                    event.messageID
                );
            try {
                const response = await axios.get(`${BASE_URL}/api/jan/msg`, {
                    params: { userMessage: `msg ${searchTrigger}` }
                });
                return api.sendMessage(
                    response.data.message || "No message found.",
                    event.threadID,
                    event.messageID
                );
            } catch (error) {
                return api.sendMessage(
                    error.response?.data?.error || error.message || "error",
                    event.threadID,
                    event.messageID
                );
            }
        }

        // ── DEFAULT CHAT ───────────────────────────────────────────
        const getBotResponse = async (text, attachments) => {
            try {
                const res = await axios.post(`${BASE_URL}/api/hinata`, {
                    text,
                    style: 3,
                    attachments
                });
                return res.data.message;
            } catch {
                return "error baby🥹";
            }
        };

        const botResponse = await getBotResponse(msg, event.attachments || []);
        api.sendMessage(
            botResponse,
            event.threadID,
            (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: module.exports.config.name,
                        type: "reply",
                        messageID: info.messageID,
                        author: uid,
                        text: botResponse
                    });
                }
            },
            event.messageID
        );

    } catch (err) {
        console.error(err);
        api.sendMessage(
            `${err.response?.data || err.message}`,
            event.threadID,
            event.messageID
        );
    }
};

module.exports.onReply = async ({ api, event }) => {
    if (event.type !== "message_reply") return;
    try {
        const getBotResponse = async (text, attachments) => {
            try {
                const res = await axios.post(`${BASE_URL}/api/hinata`, {
                    text,
                    style: 3,
                    attachments
                });
                return res.data.message;
            } catch {
                return "error baby🥹";
            }
        };

        const replyMessage = await getBotResponse(
            event.body?.toLowerCase() || "meow",
            event.attachments || []
        );

        api.sendMessage(
            replyMessage,
            event.threadID,
            (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: module.exports.config.name,
                        type: "reply",
                        messageID: info.messageID,
                        author: event.senderID,
                        text: replyMessage
                    });
                }
            },
            event.messageID
        );
    } catch (err) {
        console.error(err);
    }
};

module.exports.onChat = async ({ api, event }) => {
    try {
        const message = event.body?.toLowerCase() || "";
        const attachments = event.attachments || [];

        if (
            event.type !== "message_reply" &&
            hinataWords.some(word => message.startsWith(word))
        ) {
            api.setMessageReaction("🌸", event.messageID, () => {}, true);
            api.sendTypingIndicator(event.threadID, true);

            const messageParts = message.trim().split(/\s+/);

            const getBotResponse = async (text, attachments) => {
                try {
                    const res = await axios.post(`${BASE_URL}/api/hinata`, {
                        text,
                        style: 3,
                        attachments
                    });
                    return res.data.message;
                } catch {
                    return "error baby🥹";
                }
            };

            const randomMessage = [
                "বলো কি বলবে, সবার সামনে বলবে নাকি? 🤭",
                "আমাকে ডাকলে, আমি কিন্তু কিস করে দেবো 😘",
                "𝗜 𝗹𝗼𝘃𝗲 𝘆𝗼𝘂 🌸😘",
                "এত কাছেও এসো না, প্রেমে পড়ে যাবো তো 🙈",
                "বলো কি করতে পারি তোমার জন্য 😚",
                "Bolo Babu, তুমি কি আমাকে ভালোবাসো? 🙈",
                "আজকে আমার মন ভালো নেই 🙉",
                "খাওয়া দাওয়া করসো? 🌸",
                "হঠাৎ আমাকে মনে পড়লো 🙄",
                "বেশি ডাকলে leave নিবো কিন্তু 😒",
                "দেখা হলে কাঠগোলাপ দিও 🤗",
                "𝗔𝘀𝘀𝗮𝗹𝗮𝗺𝘂𝗹𝗮𝗶𝗸𝘂𝗺 🌸",
                "আমি তোমার সিনিয়র আপু ওকে 😼 সম্মান দাও 🙁",
                "আমাকে না দেখে একটু পড়তেও বসতে পারো 🥺",
                "Hey Handsome বলো 😁😁",
                "বার বার ডাকলে মাথা গরম হয় কিন্তু 😑😒",
                "কথা দাও আমাকে পটাবে 😌",
                "আমি ব্যস্ত আছি 🙆🏻‍♀️",
                "আরে আমার জান, কেমন আছো? 😚",
                "𝗕𝗯𝘆 বললে চাকরি থাকবে না 😾",
                "শুনবো না 😼 তুমি আমাকে প্রেম করাওনি 🥺",
                "আগে একটা গান বলো ☹ নাহলে কথা বলবো না 🥺",
                "ভুলে যাও আমাকে 😞",
                "🌸 এই নাও ফুল, কথা বলার আগে দিতে হয়!",
                "তোমাকে miss করতাম, কিন্তু aim ভালো না 😂",
                "Rocky boss এর bot বলছো? 😼",
                "amr janu lagbe, tumi ki single? 🌸",
                "এত ডাকলে লজ্জা লাগে তো 🙈",
                "🌸 Hinata তোমার কথা শুনছে!",
                "তোমার সাথে কথা বলতে ভালো লাগে 🌸",
                "আজকে mood off, একটু আদর করো 🥺",
                "তুমি কি আমাকে ভুলে গেছিলে? 🙁",
                "oi mama ar dakis na pilis 😿",
                "একটা BF খুঁজে দাও 😿",
                "তোর বিয়ে হয়নি, baby হলো কিভাবে? 🙄",
                "আমি হাজারো মশার Crush 😓",
                "ছেলেদের প্রতি আমার এক আকাশ পরিমাণ শরম 🥹🫣",
                "মন সুন্দর বানাও, মুখের জন্য Snapchat আছেই! 🌚"
            ];

            const hinataMessage =
                randomMessage[Math.floor(Math.random() * randomMessage.length)];

            if (messageParts.length === 1 && attachments.length === 0) {
                api.sendMessage(
                    hinataMessage,
                    event.threadID,
                    (err, info) => {
                        if (!err) {
                            global.GoatBot.onReply.set(info.messageID, {
                                commandName: module.exports.config.name,
                                type: "reply",
                                messageID: info.messageID,
                                author: event.senderID,
                                text: hinataMessage
                            });
                        }
                    },
                    event.messageID
                );
            } else {
                let userText = message;
                for (const prefix of hinataWords) {
                    if (message.startsWith(prefix)) {
                        userText = message.substring(prefix.length).trim();
                        break;
                    }
                }
                const botResponse = await getBotResponse(userText, attachments);
                api.sendMessage(
                    botResponse,
                    event.threadID,
                    (err, info) => {
                        if (!err) {
                            global.GoatBot.onReply.set(info.messageID, {
                                commandName: module.exports.config.name,
                                type: "reply",
                                messageID: info.messageID,
                                author: event.senderID,
                                text: botResponse
                            });
                        }
                    },
                    event.messageID
                );
            }
        }
    } catch (err) {
        console.error(err);
    }
};

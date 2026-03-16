const TelegramBot = require('node-telegram-bot-api');
const token = '8606713729:AAH4ks0jomJJSap3_ue4APlnD0BFOn-crM4';
const chatId = '-1003768744555';

const bot = new TelegramBot(token, { polling: false });

bot.sendMessage(chatId, '🚨 *Test Message* from Distress Signal Network!', { parse_mode: 'Markdown' })
    .then(() => {
        console.log('Successfully sent test message to Telegram!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to send Telegram message:', err.message);
        if (err.response && err.response.body) {
            console.error('Details:', err.response.body);
        }
        process.exit(1);
    });

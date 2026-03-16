const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const token = '8606713729:AAH4ks0jomJJSap3_ue4APlnD0BFOn-crM4';
const bot = new TelegramBot(token, { polling: true });

console.log('Bot is listening for messages to grab the Chat ID...');

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const chatName = msg.chat.title || msg.chat.first_name || 'the chat';
    console.log(`Received message from: ${chatName} \nChat ID is: ${chatId}`);

    // Update .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('TELEGRAM_CHAT_ID=')) {
        envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/, `TELEGRAM_CHAT_ID=${chatId}`);
    } else {
        envContent += `\nTELEGRAM_CHAT_ID=${chatId}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('.env updated successfully with Chat ID!');

    // Send a confirmation back
    bot.sendMessage(chatId, '✅ Distress Signal Network bot successfully connected to this channel! You will now receive alerts here.')
        .then(() => {
            bot.stopPolling();
            process.exit(0);
        });
});

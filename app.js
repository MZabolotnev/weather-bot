require('dotenv').config({ path: './env/tokens.env' });
const bot = require('./src/bot');

bot.start();
require('dotenv').config({ path: './env/tokens.env' });
const Telegraf = require('telegraf');
const session = require('telegraf/session');
const sendMessage = require('./src/send-message');
const helper = require('./src/helper');

const app = new Telegraf(process.env.TELEGRAM_TOKEN);
app.startPolling();
module.exports.instance = app;

app.use(session());
app.start((ctx) => helper.botStart(ctx));
app.on('text', (ctx) => helper.botTextInput(ctx));
app.action('addAgent', (ctx) => helper.botAddAgent(ctx));
app.on('location', (ctx) => helper.botLocation(ctx));
app.action('now', (ctx) => sendMessage.getLocation(ctx));
app.action('stop', (ctx) => helper.stopConversation(ctx));

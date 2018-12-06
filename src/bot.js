const processMessage = require('./process-message');
const Telegraf = require('telegraf');
const session = require('telegraf/session');
const sendMessage = require('./send-message');
const getWeather = require('./weather-service');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const admins = process.env.ADMIN_ID.split(',');
const onlineAdmins = [];

module.exports.start = () => {
    return bot.startPolling();
};
module.exports.instance = bot;

bot.use(session());
bot.start((ctx) => {
    if (admins.includes(ctx.from.id.toString())) {
        ctx.session.id = ctx.from.id.toString();
        ctx.session.role = 'admin';
        ctx.session.free = true;
        ctx.session.interlocutor = {};
        onlineAdmins.push(ctx.session);
        ctx.reply('Welcome, admin!');
    } else {
        ctx.session.id = ctx.from.id.toString();
        ctx.session.role = 'user';
        ctx.session.free = true;
        ctx.session.interlocutor = {};
        sendMessage.userTemplate(ctx, 'Hi, what can I do for you?');
    }
});

bot.on('text', (ctx) => input(ctx));


bot.action('addAgent', (ctx) => {
    if (onlineAdmins.length > 0) {
        const freeAdmins = getFreeAdmins(onlineAdmins);
        const admin = freeAdmins[Math.floor(Math.random() * (freeAdmins.length + 1))]
        if(admin) {
            ctx.session.free = false;
            ctx.session.interlocutor = admin;
            admin.free = false;
            admin.interlocutor = ctx.session;
            sendMessage.text(admin.id, `Connected user ${ctx.from.username}. He is the sender of the following messages:`,
                );
            sendMessage.userTemplate(ctx, 'Agent is connected, write him something:');
        }
    }
});

bot.action(['minutely','hourly','daily'], (ctx) => {
    sendMessage.getLocation(ctx).then(() => {
        // console.log('ctx data', ctx.callbackQuery.data);
        ctx.session.choice = ctx.callbackQuery.data;
        bot.on('location', (res) => {
            // console.log('choice', res.session.choice);
            getWeather(
                res.update.message.location.latitude,
                res.update.message.location.longitude,
                res.session.choice
            ).get().then(data => {
                sendMessage.sendWeather(ctx, data,  ctx.session.choice).then(() => {
                    sendMessage.userTemplate(ctx, "What else can I do for you?");
                })
            });
        });
    })

});

bot.action('stop', (ctx) => {
    sendMessage.text(ctx.from.id.toString(), `Connection close`);
    sendMessage.text(ctx.session.interlocutor.id.toString(), `Connection close`);
    ctx.session.interlocutor.free = true;
    ctx.session.interlocutor.interlocutor = {};
    ctx.session.free = true;
    ctx.session.interlocutor = {};
});


function input(ctx) {
    console.log(ctx.message.text);
    if (ctx.session.role === 'user') {
      if  (ctx.session.free) {
          processMessage(ctx);
      } else {
        sendMessage.transfer(ctx);
      }
    } else if (ctx.session.role === 'admin') {
        if (ctx.session.free) {
            sendMessage.text(ctx.from.id.toString(), 'Please wait for the user to connect.');
        } else {
            sendMessage.transfer(ctx);

        }
    }
}

function getFreeAdmins(admins) {
    return admins.filter(el => {
        if (el.free) return el;
    })
}

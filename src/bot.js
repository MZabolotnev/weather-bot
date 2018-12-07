const processMessage = require('./process-message');
const Telegraf = require('telegraf');
const session = require('telegraf/session');
const sendMessage = require('./send-message');
const getWeather = require('./weather-service');
const helper = require('./helper');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const admins = process.env.ADMIN_ID.split(',');
const onlineAdmins = [];

module.exports.start = () => {
    return bot.startPolling();
};
module.exports.instance = bot;

bot.use(session());
bot.start((ctx) => roleDistribution(ctx));
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
        } else {
            sendMessage.userTemplate(ctx, 'Sorry, there are no free agents online now :(');
        }
    } else {
        sendMessage.userTemplate(ctx, 'Sorry, there are no free agents online now :(');
    }
});

bot.on('location', (ctx) => {
    // sendMessage.removeKeyboard(ctx);
    let time ;
    if(ctx.session.params) {
        time = helper.timeParse(ctx.session.params);
    } else {
        time = new Date().toString();
        console.log(time);
    }
    getWeather({
        latitude: ctx.update.message.location.latitude,
        longitude: ctx.update.message.location.longitude,
        time: time,
        language: 'en',
        exclude: ['hourly', 'daily'],
        units: 'ca'
    }).get().then(weather => {
        sendMessage.sendWeather(ctx, weather);
        sendMessage.userTemplate(ctx, 'Do something else for you?');
        ctx.session.params = undefined;
    });
});

bot.action('now', (ctx) => {
    sendMessage.getLocation(ctx);
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
    } else {
        roleDistribution(ctx);
    }
}

function getFreeAdmins(admins) {
    return admins.filter(el => {
        if (el.free) return el;
    })
}

function roleDistribution (ctx) {
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
}

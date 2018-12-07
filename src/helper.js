const processMessage = require('./process-message');
const sendMessage = require('./send-message');
const getWeather = require('./weather-service');
const NodeGeocoder = require('node-geocoder');
const bot = require('../app');
const Markup = require('telegraf/markup');
const admins = process.env.ADMIN_ID.split(',');
const onlineAdmins = [];

const GeoOptions = {
    provider: 'opencage',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODE_API_KEY,
    formatter: null
};
const geocoder = NodeGeocoder(GeoOptions);
const weatherButtons = [[Markup.callbackButton('Weather right now', 'now')]];

function getFreeAdmins(admins) {
    return admins.filter(el => {
        if (el.free) return el;
    })
}

function checkLocation(params) {
    return new Promise((resolve) => {
        if (params.address.stringValue){
            geocoder.geocode(params.address.stringValue, function(err, res) {
                resolve({
                    latitude: res[0].latitude,
                    longitude: res[0].longitude
                })
            });
        } else {
            resolve(undefined);
        }
    });
}

function timeParse(params) {
    console.log(params);
    if (params.date_time.stringValue) {
        return params.date_time.stringValue;
    } else if (params.date_time.structValue) {
        if (params.date_time.structValue.fields.startDate) {
            return params.date_time.structValue.fields.startDate.stringValue;
        } else {
            return params.date_time.structValue.fields.startDateTime.stringValue;
        }
    } else {
        return new Date().toString();
    }
}

module.exports.timeParse = timeParse;

module.exports.botStart = (ctx) => {
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
};

module.exports.botAddAgent = (ctx) => {
    if (onlineAdmins.length > 0) {
        const freeAdmins = getFreeAdmins(onlineAdmins);
        const admin = freeAdmins[Math.floor(Math.random() * (freeAdmins.length + 1))];
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
};

module.exports.botLocation = (ctx) => {
    let time ;
    if(ctx.session.params) {
        time = timeParse(ctx.session.params);
    } else {
        time = new Date().toString();
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
};

module.exports.stopConversation = (ctx) => {
    sendMessage.text(ctx.from.id.toString(), `Connection close`);
    sendMessage.text(ctx.session.interlocutor.id.toString(), `Connection close`);
    ctx.session.interlocutor.free = true;
    ctx.session.interlocutor.interlocutor = {};
    ctx.session.free = true;
    ctx.session.interlocutor = {};
};

module.exports.botTextInput = (ctx) => {
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
};

module.exports.processWeatherQueryParser = (ctx, data) => {
    const params = data.parameters.fields;
    checkLocation(params).then(res => {
        if (res) {
            getWeather({
                latitude: res.latitude,
                longitude: res.longitude,
                time: timeParse(params),
                language: 'en',
                exclude: ['hourly', 'daily'],
                units: 'ca'
            }).get().then(weather => {
                console.log(weather);
                sendMessage.sendWeather(ctx, weather);
                sendMessage.userTemplate(ctx, 'Do something else for you?');
            });

        } else {
            ctx.session.params = params;
            sendMessage.getLocation(ctx);
        }

    });
};

module.exports.sendUserTemplate = (ctx, text) => {
    const keyboard = [...weatherButtons];
    if(ctx.session.role === 'user' && ctx.session.free) {
        keyboard.push([Markup.callbackButton('Switch to agent', 'addAgent')]);
    } else if (ctx.session.role === 'user' && !ctx.session.free) {
        keyboard.push([Markup.callbackButton('Stop conversation', 'delAgent')]);
    }
    const resKeyboard = Markup.inlineKeyboard(keyboard).extra();
    return ctx.reply(text, resKeyboard);
};

module.exports.sendTransfer = (ctx) => {
    const keyboard = [];
    keyboard.push(Markup.callbackButton('Stop conversation', 'stop'));
    return bot.instance.telegram.sendMessage(
        ctx.session.interlocutor.id.toString(),
        ctx.message.text,
        Markup.inlineKeyboard(keyboard).extra()
    );
};

module.exports.sendText = (id, text) => {
    return bot.instance.telegram.sendMessage(id, text)
};

module.exports.sendGetLocation = (ctx) => {
    let keyboard = Markup
        .keyboard([Markup.locationRequestButton('Send location')])
        .oneTime()
        .resize()
        .extra();
    return ctx.reply('Click the button to geolocate:', keyboard);
};

module.exports.sendRemoveKeyboard = (ctx) => {
    return bot.instance.telegram.sendMessage(ctx.from.id, 'test', {
        reply_markup: {
            remove_keyboard: true,
        }
    })
};

module.exports.sendWeather = (ctx, data) => {
    let weather = data.currently;
    let message = `<b>${weather.summary}</b>
Temperature: <b>${weather.temperature} °C</b>
Apparent Temperature: <b>${weather.apparentTemperature} °C</b>
Wind Speed: <b>${weather.windSpeed} kph</b>`;
    return ctx.replyWithHTML(message);
};

module.exports.processIntentHandler = (ctx, responses) => {
    const result = responses[0].queryResult;
    if (result.action === 'weather') {
        helper.processWeatherQueryParser(ctx, result);
    } else {
        sendMessage.userTemplate(ctx, result.fulfillmentText);
    }
};
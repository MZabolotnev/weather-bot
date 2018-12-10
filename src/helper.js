const NodeGeocoder = require('node-geocoder');
const Markup = require('telegraf/markup');
const processMessage = require('./process-message');
const sendMessage = require('./send-message');
const getWeather = require('./weather-service');
const bot = require('../app');

const admins = process.env.ADMIN_ID.split(',');
const onlineAdmins = [];

const GeoOptions = {
    provider: 'opencage',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODE_API_KEY,
    formatter: null,
};
const geoCoder = NodeGeocoder(GeoOptions);
const weatherButtons = [[Markup.callbackButton('Weather right now', 'now')]];

function getFreeAdmins(arr) {
    return arr.filter((el) => {
        if (el.free) {
            return el;
        }
        return undefined;
    });
}

function timeParse(params) {
    if (params.date_time.stringValue) {
        return params.date_time.stringValue;
    }
    if (params.date_time.structValue) {
        if (params.date_time.structValue.fields.startDate) {
            return params.date_time.structValue.fields.startDate.stringValue;
        }
        return params.date_time.structValue.fields.startDateTime.stringValue;
    }
    return new Date().toString();
}

function userContextTemplate(ctx) {
    let template = `Connected user ${ctx.from.username}.
He is the sender of the following messages.
Context of the last 10 queries:
`;
    if (ctx.session.context.length > 0) {
        ctx.session.context.forEach((el) => {
            template += `💬 ${el}\n`;
        });
    } else {
        template += 'No context.';
    }

    return template;
}

function checkLocation(params) {
    return new Promise((resolve) => {
        if (params.address.stringValue) {
            geoCoder.geocode(params.address.stringValue, (err, res) => {
                resolve({
                    latitude: res[0].latitude,
                    longitude: res[0].longitude,
                });
            });
        } else {
            resolve(undefined);
        }
    });
}

function processWeatherQueryParser(ctx, data) {
    const params = data.parameters.fields;
    checkLocation(params).then((res) => {
        if (res) {
            getWeather({
                latitude: res.latitude,
                longitude: res.longitude,
                time: timeParse(params),
                language: 'en',
                exclude: ['hourly', 'daily'],
                units: 'ca',
            })
                .get()
                .then((weather) => {
                    sendMessage.sendWeather(ctx, weather);
                    sendMessage.userTemplate(ctx, 'Do something else for you?');
                });
        } else {
            ctx.session.params = params;
            sendMessage.getLocation(ctx);
        }
    });
}

function roleDistribution(ctx) {
    if (admins.includes(ctx.from.id.toString())) {
        ctx.session.id = ctx.from.id.toString();
        ctx.session.role = 'admin';
        ctx.session.free = true;
        ctx.session.interlocutor = {};
        onlineAdmins.push(ctx.session);
    } else {
        ctx.session.id = ctx.from.id.toString();
        ctx.session.role = 'user';
        ctx.session.free = true;
        ctx.session.interlocutor = {};
        ctx.session.context = [];
    }
}

module.exports.timeParse = timeParse;

module.exports.botStart = (ctx) => {
    roleDistribution(ctx);
    if (ctx.session.role === 'user') {
        sendMessage.userTemplate(ctx, 'Hi, what can I do for you?');
    } else if (ctx.session.role === 'admin') {
        ctx.reply('Welcome, admin!');
    }
};

module.exports.botAddAgent = (ctx) => {
    if (onlineAdmins.length > 0) {
        const freeAdmins = getFreeAdmins(onlineAdmins);
        const admin = freeAdmins[0];
        if (admin) {
            ctx.session.free = false;
            ctx.session.interlocutor = admin;
            admin.free = false;
            admin.interlocutor = ctx.session;
            sendMessage.text(admin.id, userContextTemplate(ctx));
        } else {
            sendMessage.userTemplate(
                ctx,
                'Sorry, there are no free agents online now :(',
            );
        }
    } else {
        sendMessage.userTemplate(
            ctx,
            'Sorry, there are no free agents online now :(',
        );
    }
};

module.exports.botLocation = (ctx) => {
    let time;
    if (ctx.session.params) {
        time = timeParse(ctx.session.params);
    } else {
        time = new Date().toString();
    }
    getWeather({
        latitude: ctx.update.message.location.latitude,
        longitude: ctx.update.message.location.longitude,
        time,
        language: 'en',
        exclude: ['hourly', 'daily'],
        units: 'ca',
    })
        .get()
        .then((weather) => {
            sendMessage.sendWeather(ctx, weather);
            sendMessage.userTemplate(ctx, 'Do something else for you?');
            ctx.session.params = undefined;
        });
};

module.exports.stopConversation = (ctx) => {
    sendMessage.text(ctx.from.id.toString(), 'Connection close');
    sendMessage.text(
        ctx.session.interlocutor.id.toString(),
        'Connection close',
    );
    ctx.session.interlocutor.free = true;
    ctx.session.interlocutor.interlocutor = {};
    ctx.session.free = true;
    ctx.session.interlocutor = {};
};

module.exports.botTextInput = (ctx) => {
    if (ctx.session.role === 'user') {
        if (ctx.session.free) {
            processMessage(ctx);
        } else {
            sendMessage.transfer(ctx);
        }
    } else if (ctx.session.role === 'admin') {
        if (ctx.session.free) {
            sendMessage.text(
                ctx.from.id.toString(),
                'Please wait for the user to connect.',
            );
        } else {
            sendMessage.transfer(ctx);
        }
    } else {
        roleDistribution(ctx);
        if (ctx.session.role === 'user') {
            processMessage(ctx);
        } else if (ctx.session.role === 'admin') {
            sendMessage.text(
                ctx.from.id.toString(),
                'Please wait for the user to connect.',
            );
        }
    }
};

module.exports.processWeatherQueryParser = processWeatherQueryParser;

module.exports.sendUserTemplate = (ctx, text) => {
    const keyboard = [...weatherButtons];
    if (ctx.session.role === 'user' && ctx.session.free) {
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
        Markup.inlineKeyboard(keyboard).extra(),
    );
};

module.exports.sendText = (id, text) => bot.instance.telegram.sendMessage(id, text);

module.exports.sendGetLocation = (ctx) => {
    const keyboard = Markup.keyboard([
        Markup.locationRequestButton('Send location'),
    ])
        .oneTime()
        .resize()
        .extra();
    return ctx.reply('Click the button to geolocate:', keyboard);
};

module.exports.sendRemoveKeyboard = ctx => bot.instance.telegram.sendMessage(ctx.from.id, 'test', {
    reply_markup: {
        remove_keyboard: true,
    },
});

module.exports.sendWeather = (ctx, data) => {
    const weather = data.currently;
    const message = `<b>${weather.summary}</b>
Temperature: <b>${weather.temperature} °C</b>
Apparent Temperature: <b>${weather.apparentTemperature} °C</b>
Wind Speed: <b>${weather.windSpeed} kph</b>`;
    return ctx.replyWithHTML(message);
};

module.exports.processIntentHandler = (ctx, responses) => {
    const result = responses[0].queryResult;
    if (result.action === 'weather') {
        processWeatherQueryParser(ctx, result);
    } else {
        sendMessage.userTemplate(ctx, result.fulfillmentText);
    }
};

module.exports.processAddContext = (ctx) => {
    ctx.session.context.push(ctx.message.text);
    if (ctx.session.context.length > 9) {
        ctx.session.context.shift();
    }
};

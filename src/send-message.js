const bot = require('./bot');
const Markup = require('telegraf/markup');

const weatherButtons = [
    [Markup.callbackButton('Weather right now', 'minutely')],
    [Markup.callbackButton('Next 48 hours weather', 'hourly')],
    [Markup.callbackButton('Next week\'s weather', 'daily')],
];


module.exports.userTemplate = (ctx, text) => {
    const keyboard = [...weatherButtons];

    if(ctx.session.role === 'user' && ctx.session.free) {
        keyboard.push([Markup.callbackButton('Switch to agent', 'addAgent')]);
    } else if (ctx.session.role === 'user' && !ctx.session.free) {
        keyboard.push([Markup.callbackButton('Stop conversation', 'delAgent')]);
    }
    return ctx.reply(text, Markup.inlineKeyboard(keyboard).extra());
};

module.exports.transfer = (ctx) => {
    const keyboard = [];
    keyboard.push(Markup.callbackButton('Stop conversation', 'stop'));
    return bot.instance.telegram.sendMessage(
        ctx.session.interlocutor.id.toString(),
        ctx.message.text,
        Markup.inlineKeyboard(keyboard).extra()
    );
};

module.exports.text = (id, text) => {
    return bot.instance.telegram.sendMessage(id, text)
};

module.exports.getLocation = (ctx) => {
    const keyboard = ['Send my location'];
    return ctx.reply(
        'Click the button to geolocate',
        Markup
            .keyboard([Markup.locationRequestButton('Send location')])
            .oneTime()
            .resize()
            .extra()
    );
};

module.exports.sendWeather = (ctx, data, choice) => {
    let weather = data.currently;
    if (data[ctx.session.choice]) {
        weather.summary = data[ ctx.session.choice].summary;
    }
    let message = `<em>${weather.summary}</em>
Temperature: <b>${weather.temperature}</b>
Apparent Temperature: <b>${weather.apparentTemperature}</b>
Wind Speed: <b>${weather.windSpeed}</b>
Temperature: <b>${weather.temperature}</b>`;
    return ctx.replyWithHTML(message);
};
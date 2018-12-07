const bot = require('./bot');
const Markup = require('telegraf/markup');


const weatherButtons = [
    [Markup.callbackButton('Weather right now', 'now')]
];


module.exports.userTemplate = (ctx, text) => {
    const keyboard = [...weatherButtons];

    if(ctx.session.role === 'user' && ctx.session.free) {
        keyboard.push([Markup.callbackButton('Switch to agent', 'addAgent')]);
    } else if (ctx.session.role === 'user' && !ctx.session.free) {
        keyboard.push([Markup.callbackButton('Stop conversation', 'delAgent')]);
    }
    const resKeyboard = Markup.inlineKeyboard(keyboard).extra();
    return ctx.reply(text, resKeyboard);
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
    let keyboard = Markup
        .keyboard([Markup.locationRequestButton('Send location')])
        .oneTime()
        .resize()
        .extra();
    return ctx.reply('Click the button to geolocate:', keyboard);
};

module.exports.removeKeyboard = (ctx) => {
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
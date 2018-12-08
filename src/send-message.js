const helper = require('./helper');

module.exports.userTemplate = (ctx, text) => helper.sendUserTemplate(ctx, text);

module.exports.transfer = ctx => helper.sendTransfer(ctx);

module.exports.text = (id, text) => helper.sendText(id, text);

module.exports.getLocation = ctx => helper.sendGetLocation(ctx);

module.exports.removeKeyboard = ctx => helper.sendRemoveKeyboard(ctx);

module.exports.sendWeather = (ctx, data) => helper.sendWeather(ctx, data);

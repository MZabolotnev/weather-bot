const dialogFlow = require('dialogflow');
const projectId = process.env.PROJECT_ID;
const LANGUAGE_CODE = 'en-US';
const sendMessage = require('./send-message');

const Telegraf = require('telegraf');

const config = {
    credentials: {
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY,
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    },
};

const sessionClient = new dialogFlow.SessionsClient(config);

module.exports = (ctx) => {
    const userId = ctx.message.from.id.toString();
    const message = ctx.message.text;
    const sessionPath = sessionClient.sessionPath(projectId, userId);
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: LANGUAGE_CODE,
            },
        },
    };

    sessionClient
        .detectIntent(request)
        .then((responses) => {
            const result = responses[0].queryResult;
            sendMessage.userTemplate(ctx, result.fulfillmentText);
        })
        .catch((err) => {
            console.error('ERROR:', err);
        });
};
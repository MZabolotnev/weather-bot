const dialogFlow = require('dialogflow');

const projectId = process.env.PROJECT_ID;
const LANGUAGE_CODE = 'en-US';
const helper = require('./helper');

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
    helper.processAddContext(ctx);
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
        .then(responses => helper.processIntentHandler(ctx, responses))
        .catch((err) => {
            console.error('ERROR:', err);
        });
};

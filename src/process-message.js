const dialogFlow = require('dialogflow');
const projectId = process.env.PROJECT_ID;
const LANGUAGE_CODE = 'en-US';
const sendMessage = require('./send-message');
const getWeather = require('./weather-service');
const helper = require('./helper');

const config = {
    credentials: {
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY,
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    },
};

const sessionClient = new dialogFlow.SessionsClient(config);

const NodeGeocoder = require('node-geocoder');

const GeoOptions = {
    provider: 'opencage',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODE_API_KEY,
    formatter: null
};

const geocoder = NodeGeocoder(GeoOptions);

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
            if (result.action === 'weather') {
                weatherQueryParser(ctx, result);
            } else {
                sendMessage.userTemplate(ctx, result.fulfillmentText);
            }
        })
        .catch((err) => {
            console.error('ERROR:', err);
        });
};



function checkLocation(params) {
    return new Promise((resolve, reject) => {
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

function weatherQueryParser(ctx, data) {
    const params = data.parameters.fields;

    checkLocation(params).then(res => {
        if (res) {
            getWeather({
                latitude: res.latitude,
                longitude: res.longitude,
                time: helper.timeParse(params),
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


}
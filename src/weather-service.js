const DarkSky = require('dark-sky');
const darksky = new DarkSky(process.env.DARK_SKY);

module.exports = (options) => {
    return darksky
        .options(options)
};
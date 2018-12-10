const DarkSky = require('dark-sky');

const darkSky = new DarkSky(process.env.DARK_SKY);

module.exports = options => darkSky.options(options);

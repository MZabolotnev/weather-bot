const DarkSky = require('dark-sky');
const darksky = new DarkSky(process.env.DARK_SKY);

module.exports = (lat, lng , period) => {
    console.log('period',period);
    const exclude = ['minutely','hourly','daily'];
    exclude.splice(exclude.indexOf(period), 1);
    console.log('array',exclude);
    return darksky
        .latitude(lat)
        .longitude(lng)
        .units('ca')
        .language('en')
        .exclude(exclude)
};
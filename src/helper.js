module.exports.timeParse = (params) => {
    console.log(params);
    if (params.date_time.stringValue) {
        return params.date_time.stringValue;
    } else if (params.date_time.structValue) {
        if (params.date_time.structValue.fields.startDate) {
            return params.date_time.structValue.fields.startDate.stringValue;
        } else {
            return params.date_time.structValue.fields.startDateTime.stringValue;
        }
    } else {
        return new Date().toString();
    }
};

// module.exports = () => {
//    
// };

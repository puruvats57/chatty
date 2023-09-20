const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const msgSchema = new Schema({

    text: {
        type: String
    },
    fileLink: {
        type: String,
    },
    sentby: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    sentDate: {
        type: Date,
        default: Date.now,
    },
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],


});

module.exports = mongoose.model("Messages", msgSchema);

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  contact: {
    cname: {
      type: String,
      required: true,
    },
    msgIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Messages'

    }],
  },
  grpIds: {
    type: [
      {
        grpId: {
          type: String,
          required: true,
        },
        count: {
          type: Number,
          default: 0,
        },
        //msgIds is the messages you have deleted
        msgIds: [{
          type: Schema.Types.ObjectId,
          ref: 'Messages'

        }],
        UnreadMsgs: [{
          type: Schema.Types.ObjectId,
          ref: 'Messages'

        }],
      },
    ],
    default: [],
  }
});

module.exports = mongoose.model("User", userSchema);

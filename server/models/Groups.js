const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const grpSchema = new Schema({
  
  groupname: {
    type: String,
    required: true,
    },
    fileLink: {
        type: String,
    },
    createdBy: {
        type:String
    },
    msgIds: [{
        type: String,
    
    }],
    
  
  
});

module.exports = mongoose.model("Groups", grpSchema);

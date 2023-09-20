const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const grpSchema = new Schema({
  
  groupname: {
    type: String,
    required: true,
    },
    createdBy: {
        type:String
    },
    msgIds: [{
        type: String,
    
    }],
    
  
  
});

module.exports = mongoose.model("Groups", grpSchema);

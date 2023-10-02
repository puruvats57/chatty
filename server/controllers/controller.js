const Messages = require("../models/Messages");
const Groups = require("../models/Groups");
const User = require("../models/User");
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ name });

  if (user) {
    console.log("User already exists");
    return res.status(409).json({ message: "User already exists" });
    //return res.redirect("/register");
  }



  user = new User({
    name,
    email,
    password
  });

  await user.save();
  //res.status(200).json({ message: "Registration successful" });
  return res.redirect("/");

}
exports.login_post = async (req, res) => {
  console.log("lets post");
  console.log(req.body);
  const { email, pass } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.send({ status: 'Email does not exist please regsiter' });
  }
  if (user.password !== pass) {
    return res.send({ status: 'Incorrect password' });
  }

  console.log("posted");
  let id = user._id;

  //console.log("after", id);

  // Generate a JWT token with the user's _id as the payload
  const token = jwt.sign({ id }, 'hell', { expiresIn: '6h' });

  return res.json({ status: 'ok', token });
};

exports.createGroup = async (req, res, next) => {
  if (req.status == 'loginfirst') {
    console.log('login first');
    //return res.json({ "data": "login" });

  }
  else {
    console.log("uid", req.uid);
    const id = req.uid.id;
    console.log("cret grp", req.body);
    const { groupname } = req.body;

    let user = await User.findOne({ _id: id });
    const createdBy = user.name;

    let grp = await Groups.findOne({ groupname, createdBy });


    if (grp) {
      console.log("group already exists");
      return res.status(409).json({ message: "group already exists" });
      //return res.redirect("/register");
    }

    grp = new Groups({
      groupname,
      fileLink: req.file.location,
      createdBy
    });

    await grp.save();
    user.grpIds.push({ grpId: grp._id, count: 0 });
    await user.save();

    return res.json({ status: 'ok' });
  }
}

exports.joinGroup = async (req, res) => {
  const { grpId, uid } = req.body;
  const user = await User.findOne({ _id: uid }); //to get userId

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.grpIds.push({ grpId: grpId, count: 0 });

  // Save the updated user document
  await user.save();
  res.status(200).json({ message: "group joined successfully" });

}
//function to show all data in group,also used to emit 
exports.openGroup = async (req, res) => {
  //console.log("groupopened",req.query.id);
  //const socket = io();
  //const io = req.io;
  const { grpId, uid } = req.body;

  const user = await User.findOne(
    {
      _id: uid,
      "grpIds.grpId": grpId,
    },
    {
      "grpIds.$": 1,
    }
  );
  console.log("user of egt groups", user);
  const msgIds = user.grpIds[0].msgIds;
  console.log("Message IDs fro user:", msgIds);

  const grp = await Groups.findOne({ _id: grpId });
  var texts;
  if (grp) {
    console.log("grp", grp);
    const grpMsgs = grp.msgIds;
    console.log("grpmsgs", grpMsgs);
    const idsNotInMsgIds = grpMsgs.filter(id => !msgIds.includes(id));
    const msg = await Messages.find({ _id: { $in: idsNotInMsgIds } }).populate('sentby', 'name');

    texts = msg.map((message) => ({
      text: message.text, fileLink: message.fileLink, textid: message.id, sentById: message.sentby.id, sendby: message.sentby.name,
    }));

    console.log("msgs", texts);


  } else {
    console.log("No matching document found in the 'Groups' collection.");
    texts = [];

  }

  //const msg = await Messages.find({ _id: {$not:{ $in: msgIds } }}).populate('sentby', 'name')

  return res.json({ texts });
}
exports.getGroups = async (req, res) => {

  const { uid } = req.body;

  var user = await User.findOne({ _id: uid });
  if (!user) {
    console.log('User not found');
    return;
  }
  //var grpIds = user.grpIds.grpId;
  var grpids = [];

  for (var i = 0; i < user.grpIds.length; i++) {
    grpids[i] = user.grpIds[i].grpId;
  }
  var count = [];
  for (var i = 0; i < user.grpIds.length; i++) {
    count[i] = user.grpIds[i].count;
  }
  //console.log("count", count);


  var data = await Groups.find({ _id: { $in: grpids } }).select('id groupname fileLink');
  const formattedData = data.map((item, index) => ({
    _id: item._id.toString(),
    groupname: item.groupname,
    fileLink: item.fileLink,
    count: count[index]
  }));
  //console.log("data", formattedData);
  //res.status(200).json({ message: data });
  return res.json({ status: 'ok', formattedData });


}
exports.deleteMsg = async (req, res) => {
  const { grpId, textId, userId, f } = req.body;
  console.log("grpId,textId,f", grpId, textId, f);
  //f==0 means remove for everyone
  if (f == '0') {

    const deleteMessageResult = await Messages.deleteOne({ _id: textId });
    console.log('Message removed successfully:', deleteMessageResult);

    // Remove the reference from the group
    const updateGroupResult = await Groups.updateOne(
      { _id: grpId },
      { $pull: { msgIds: textId } }
    );
    console.log('Field removed from group successfully:', updateGroupResult);
  }
  else {
    const result = await User.updateOne(
      {
        _id: userId,
        "grpIds.grpId": grpId,
      },
      {
        $push: {
          "grpIds.$.msgIds": textId,
        },
      }
    );
    console.log('Field pushed user model successfully:', result);
  }

}

exports.sendMsg = async (req, res, io) => {
  const { text, sentby, grpid } = req.body;
  const currentDate = new Date();
  msg = new Messages({
    text,
    sentby,
    sentDate: currentDate
  });

  await msg.save();
  const msgid = msg._id;

  const grp = await Groups.findOne({ _id: grpid });
  if (!grp) {
    return res.status(404).json({ error: 'group not found' });
  }
  grp.msgIds.push(msgid);

  await grp.save();
  io.emit('messageCount', { grpId, count: messageCounts[grpid] });
  io.to(grpid).emit('newMessage', message);
  res.status(200).json({ message: "msg sent successfully" });

}

exports.addMembers = async (req, res) => {
  let { grpId, email } = req.body;
  console.log("grpId,email", grpId, email);

  // Create a Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // e.g., 'gmail', 'hotmail', etc.
    auth: {
      user: 'prateekvats963@gmail.com',
      pass: 'hixwjkmxxykbrnwt',
    },
  });
  const dynamicURL = `http://localhost:5000/grpJoined/${grpId}/${email}`;
  // Create an HTML email template with a button
  const emailBody = `
  <html>
    <body>
      <p>Click the button below to join:</p>
      <a href="${dynamicURL}">
        <button style="padding: 10px 20px; background-color: #008CBA; color: #fff; border: none; cursor: pointer;">Join Now</button>
      </a>
    </body>
  </html>
`;

  // Define the email options
  const mailOptions = {
    from: 'prateekvats963@gmail.com',
    to: email,
    subject: 'Join grp',
    html: emailBody,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email' });

    } else {
      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Email sent successfully' });
    }
  });
}

exports.grpJoined = async (req, res) => {
  const io = req.app.io;
  let { grpId, email } = req.body;
  console.log("grpId1,email1", grpId, email);
  const user = await User.findOne({ email: email });
  console.log("user", user);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.grpIds.push({ grpId: grpId, count: 0 });
  await user.save();
  //io.join(grpId);

  io.to(grpId).emit('broadcastJoined', { name: user.name, id: user._id });

  res.status(200).json({ message: "group joined successfully" });
}

exports.getUsers = async (req, res) => {
  const { uid } = req.body;
  const users = await User.find({ _id: { $ne: uid } });
  console.log("user", users);
  return res.json({ status: 'ok', users });
}







const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const Messages = require("./models/Messages");
const Groups = require("./models/Groups");
const User = require("./models/User");
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const controller = require('./controllers/controller');
const { isAuth } = require("./middleware/isAuth");
const multer = require('multer');
const multerS3 = require('multer-s3-transform');
const aws = require('aws-sdk');
const socketIO = require('socket.io');
require('dotenv').config();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/chat", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('mongodb Connected Successfully'))
  .catch((err) => { console.error(err); });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
});

const s3 = new aws.S3({
  region: 'us-east-1', // Change to your preferred AWS region
  credentials: {
    accessKeyId:process.env.accessKeyId,
    secretAccessKey:process.env.secretAccessKey,
  },
});


// Multer-S3 Configuration (AWS SDK v3)
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'akkyou',
    acl: 'public-read', // Make uploaded files public
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + path.extname(file.originalname));
    },
  }),
});
app.use('/uploads', express.static('uploads'));

const server = http.createServer(app);
const io = socketIO(server);
app.io = io;

//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

var sock;
/*io.on('connection', socket => {
  sock = socket;
})*/
let socket;
var messageCounts = 0;
io.on('connection', newSocket => {
  // var messageCounts = 0;
  socket = newSocket;
  var f = 0;

  socket.on('join', async ({ grpId, uid }) => {
    messageCounts = 0;
    socket.join(grpId);
    const result = await User.updateOne(
      {
        _id: uid,
        "grpIds.grpId": grpId,
      },
      {
        $set: { "grpIds.$.count": 0 },
      }
    );
    /*const Unread = await User.updateOne(
      {
        _id: uid,
        "grpIds.grpId": grpId,
      },
      {
        $pull: {
          "grpIds.$.UnreadMsgs": data.msgId,
        },
      }
    );*/

  });

  socket.on('onHome', () => {
    console.log("came to home");
    messageCounts = 0;
  })


  socket.on('url', async (data) => {


    const parts = data.url.split('/');
    const lastPart = parts[parts.length - 1];


    try {
      if (lastPart === 'home') {
        f = 1;
        console.log("execute");
        //messageCounts++;

        const result = await User.updateOne(
          {
            _id: data.uid,
            "grpIds.grpId": data.grpId,
          },
          {
            $set: { "grpIds.$.count": data.count },
          }
        );
        /*const Unread = await User.updateOne(
          {
            _id: data.uid,
            "grpIds.grpId": data.grpId,
          },
          {
            $push: {
              "grpIds.$.UnreadMsgs": data.msgId,
            },
          }
        );*/
        const grp = await Groups.findOne({ _id: data.grpId });
        if (!grp) {
          return res.status(404).json({ error: 'group not found' });
        }
        grp.msgIds.push(data.msgId);

        await grp.save();
        const read = await Messages.updateOne(
          {
            _id: data.msgId
          },
          {
            $push: {
              readBy: data.uid,
            },
          }
        );
      }
      else {
        f = 0;
        console.log("not execute");
        //messageCounts = 0;

        const result = await User.updateOne(
          {
            _id: data.uid,
            "grpIds.grpId": data.grpId,
          },
          {
            $set: { "grpIds.$.count": 0 },
          }
        );

        const read = await Messages.updateOne(
          {
            _id: data.msgId
          },
          {
            $push: {
              readBy: data.uid,
            },
          }
        );
        console.log("readBy", read);

        //console.log("Count set to 0 successfully:", result);
      }
    } catch (error) {
      console.error("Error:", error);
    }

    // End of url socket
  });


  socket.on('newMessage', async ({ id, text, uid }) => {
    var senderuid = uid;
    var name = await User.find({ _id: uid }).select('name');
    var senderName = name[0].name;
    console.log("name", name[0].name);
    const currentDate = new Date();
    msg = new Messages({
      text,
      sentby: uid,
      sentDate: currentDate
    });

    await msg.save();
    const msgid = msg._id;
    console.log("msgid", msgid);
    const grp = await Groups.findOne({ _id: id });
    if (!grp) {
      return res.status(404).json({ error: 'group not found' });
    }
    grp.msgIds.push(msgid);

    await grp.save();


    messageCounts++;
    console.log("messagecounts", messageCounts);

    io.emit('messageCount', { id, text, msgid, senderuid, senderName, count: messageCounts });
    io.to(id).emit('newMessage', { text, fileLink: '', id, msgid, senderuid, senderName });

  });

});

app.post('/upload', upload.single('file'), async function (req, res) {
  try {

    const id = req.body.id;
    const uid = req.body.uid;
    const senderuid = uid;
    var name = await User.find({ _id: uid }).select('name');
    var senderName = name[0].name;
    console.log("name", name[0].name);
    const currentDate = new Date();
    msg = new Messages({
      fileLink: req.file.location,
      sentby: uid,
      sentDate: currentDate
    });

    await msg.save();
    const msgid = msg._id;
    console.log("msgid", msgid);
    const grp = await Groups.findOne({ _id: id });
    if (!grp) {
      return res.status(404).json({ error: 'group not found' });
    }
    grp.msgIds.push(msgid);

    await grp.save();


    messageCounts++;
    console.log("messagecounts", messageCounts);

    io.emit('messageCount', { id, text: '', msgid, senderuid, senderName, count: messageCounts });
    io.to(id).emit('newMessage', { text: '', fileLink: req.file.location, id, msgid, senderuid, senderName });

    res.status(201).json({ message: 'File uploaded successfully', fileLink: req.file.location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'File upload failed' });
  }
})


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'entry.html'));


});
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'home.html'));


});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'))
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'register.html'))
});
app.get('/creategrp',(req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'creategrp.html'));
});
app.get('/group/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'group.html'));
  //controller.openGroup(req, res,sock);
});
app.get('/addMembers/:queryString', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'addMembers.html'));
});
app.get('/grpJoined/:grpId/:email', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'grpJoined.html'));
});

app.post("/register", controller.register);
app.post("/createGroup", isAuth,upload.single('file'), controller.createGroup);
app.post("/joinGroup", controller.joinGroup);

app.post("/loginPost", controller.login_post);
//for home page
app.post("/getGroups", controller.getGroups);
app.post("/openGroup", controller.openGroup);
app.post("/deleteMsg", controller.deleteMsg);
app.post("/addMembers", controller.addMembers);
//app.post('/grpJoined',controller.grpJoined);
app.post('/grpJoined', async function (req, res) {

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
})


const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server is started on http://127.0.0.1:${PORT}`);
});


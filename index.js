import { collectionsName, databaseName, serverAnswers } from 'const.js';
import cors from 'cors';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import dotenv from 'dotenv';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { stripHtml } from 'string-strip-html';

dotenv.config();
dayjs.extend(utc);
function timeUTC() {
  return dayjs.utc().format('HH:mm:ss');
}

const server = express();

let users;
let messages;
server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db(`${databaseName}`);
  users = db.collection(collectionsName.usersList);
  messages = db.collection(collectionsName.messagesList);
});

function statusMessage(from, text) {
  messages.insertOne({
    from,
    to: 'Todos',
    text,
    type: 'status',
    time: timeUTC(),
  });
}

setInterval(() => {
  users
    .find()
    .toArray()
    .then((allUsers) => {
      allUsers.forEach((user) => {
        if (Date.now() - user.lastStatus > 10000) {
          users.deleteOne({ name: user.name });
          statusMessage(user.name, 'sai da sala...');
        }
      });
    });
}, 15000);

// Validation
server.post('/participants', (req, res) => {
  const name = stripHtml(req.body.name).result;
  const valid = true;
  if (!valid) {
    return res
      .status(serverAnswers.postParticipants.invalidUser.code)
      .send(serverAnswers.postParticipants.invalidUser.message);
  }
  users.findOne({ name }).then((user) => {
    if (user !== null) {
      return res
        .status(serverAnswers.postParticipants.userAlreadyExists.code)
        .send(serverAnswers.postParticipants.userAlreadyExists.message);
    }
    users.insertOne({ name, lastStatus: Date.now() });
    statusMessage(name, 'entra na sala...');
    return res.sendStatus(serverAnswers.postParticipants.userCreated.code);
  });
});

// .find({}, { _id: 0}) does not work
server.get('/participants', (req, res) => {
  users
    .find({}, { _id: 0 })
    .toArray()
    .then((allUsers) => res.send(allUsers));
});

// Validation
server.post('/messages', (req, res) => {
  const from = stripHtml(req.headers.user).result;
  const to = stripHtml(req.body.to).result;
  const text = stripHtml(req.body.text).result;
  const type = stripHtml(req.body.type).result;
  const valid = true;
  if (!valid) {
    return res
      .status(serverAnswers.postMsgs.invalidMsg.code)
      .send(serverAnswers.postMsgs.invalidMsg.message);
  }
  messages.insertOne({
    from,
    to,
    text,
    type,
    time: timeUTC(),
  });
  return res.sendStatus(serverAnswers.postMsgs.msgCreated.code);
});

server.get('/messages', (req, res) => {
  let from = req.headers.user;
  from = from.trim();
  const to = from;
  const numOfMessages = req.query?.limit;

  messages
    .find({ $or: [{ from }, { to }, { type: { $in: ['message', 'status'] } }] })
    .toArray()
    // .then((allMessages) => res.send(allMessages));
    .then((allMessages) => res.send(allMessages.slice(-numOfMessages)));
  // .then((allMessages) => res.send(allMessages.slice(-numOfMessages || 0)));
});

server.post('/status', (req, res) => {
  let { user } = req.headers;
  user = user.trim();
  users.findOne({ name: user }).then((user) => {
    if (user === null) {
      return res.sendStatus(serverAnswers.postStatus.userNotFound.code);
    }
    users.updateOne({ _id: user._id }, { $set: { lastStatus: Date.now() } });
    return res.sendStatus(serverAnswers.postStatus.statusUpdated.code);
  });
});

// Bonuses
server.delete('/messages/:ID', (req, res) => {
  const { user } = req.headers;
  const { ID } = req.params;
  messages.findOne({ _id: ObjectId(ID) }).then((message) => {
    if (message === null) {
      return res.sendStatus(serverAnswers.deleteMsgs.msgNotFound.code);
    }
    if (message.from !== user) {
      return res.sendStatus(serverAnswers.deleteMsgs.userNotOwner.code);
    }
  });
  messages.deleteOne({ _id: ObjectId(ID) });
  return res.sendStatus(serverAnswers.deleteMsgs.msgDeleted.code);
});
// Validation
server.put('/messages/:ID', (req, res) => {
  const from = req.headers.user;
  const { ID } = req.params;
  const to = stripHtml(req.body.to).result;
  const text = stripHtml(req.body.text).result;
  const type = stripHtml(req.body.type).result;
  const valid = true;
  if (!valid) {
    return res
      .status(serverAnswers.editMsgs.invalidMsg.code)
      .send(serverAnswers.editMsgs.invalidMsg.message);
  }
  messages.findOne({ _id: ObjectId(ID) }).then((message) => {
    if (message === null) {
      return res.sendStatus(serverAnswers.editMsgs.msgNotFound.code);
    }
    if (message.from !== from) {
      return res.sendStatus(serverAnswers.editMsgs.userNotOwner.code);
    }
  });
  messages.updateOne({ _id: ObjectId(ID) }, { $set: { to, text, type } });
  return res.sendStatus(serverAnswers.deleteMsgs.msgDeleted.code);
});

server.listen(5000, () => {
  console.log('listening port 5000');
});

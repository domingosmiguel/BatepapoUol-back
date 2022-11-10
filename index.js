import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import Joi from 'joi';
import { MongoClient, ObjectId } from 'mongodb';
import { stripHtml } from 'string-strip-html';
import { collectionsName, databaseName, serverAnswers } from './const.js';
import { timeUTC } from './functions.js';

dotenv.config();
const schema = Joi.object({
  username: Joi.string().min(3).max(20),
  to: Joi.string().min(3).max(20),
  text: Joi.string().min(1).max(280),
  type: Joi.string().pattern(/^(message|private_message)$/),
});
const server = express();
server.use(express.json());
server.use(cors());

let users;
let messages;

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

server.post('/participants', async (req, res) => {
  const name = stripHtml(req.body.name || '').result;
  const valid = !schema.validate({ username: name }).error;
  if (!valid) {
    return res
      .status(serverAnswers.postParticipants.invalidUser.code)
      .send(serverAnswers.postParticipants.invalidUser.message);
  }
  try {
    const user = await users.findOne({ name });
    if (user !== null) {
      return res
        .status(serverAnswers.postParticipants.userAlreadyExists.code)
        .send(serverAnswers.postParticipants.userAlreadyExists.message);
    }
    users.insertOne({ name, lastStatus: Date.now() });
    statusMessage(name, 'entra na sala...');
    return res.sendStatus(serverAnswers.postParticipants.userCreated.code);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

// .find({}, { _id: 0}) does not work
server.get('/participants', async (req, res) => {
  try {
    const allUsers = await users.find({}, { _id: 0 }).toArray();
    return res.send(allUsers);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

server.post('/messages', async (req, res) => {
  const from = stripHtml(req.headers.user || '').result;
  const to = stripHtml(req.body.to || '').result;
  const text = stripHtml(req.body.text || '').result;
  const type = stripHtml(req.body.type || '').result;
  const valid = !schema.validate({ username: from, to, text, type }).error;
  if (!valid) {
    return res
      .status(serverAnswers.postMsgs.invalidMsg.code)
      .send(serverAnswers.postMsgs.invalidMsg.message);
  }
  try {
    await messages.insertOne({
      from,
      to,
      text,
      type,
      time: timeUTC(),
    });
    return res.sendStatus(serverAnswers.postMsgs.msgCreated.code);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

// $slice no .find()??
server.get('/messages', async (req, res) => {
  const from = stripHtml(req.headers.user || '').result;
  const to = from;
  const limit = parseInt(req.query.limit, 10);

  try {
    const allMessages = await messages
      .find({
        $or: [
          { from },
          { to },
          { to: 'Todos' },
          { type: { $in: ['message', 'status'] } },
        ],
      })
      .toArray();
    return res.send(allMessages.slice(-limit));
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

server.post('/status', async (req, res) => {
  let { user } = req.headers;
  user = user.trim();
  try {
    const userData = await users.findOne({ name: user });
    if (userData === null) {
      return res.sendStatus(serverAnswers.postStatus.userNotFound.code);
    }
    users.updateOne(
      { _id: userData._id },
      { $set: { lastStatus: Date.now() } }
    );
    return res.sendStatus(serverAnswers.postStatus.statusUpdated.code);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

server.delete('/messages/:ID', async (req, res) => {
  const { user } = req.headers;
  const { ID } = req.params;
  try {
    const message = await messages.findOne({ _id: ObjectId(ID) });
    if (message === null) {
      return res.sendStatus(serverAnswers.deleteMsgs.msgNotFound.code);
    }
    if (message.from !== user) {
      return res.sendStatus(serverAnswers.deleteMsgs.userNotOwner.code);
    }
    messages.deleteOne({ _id: ObjectId(ID) });
    return res.sendStatus(serverAnswers.deleteMsgs.msgDeleted.code);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

server.put('/messages/:ID', async (req, res) => {
  const from = req.headers.user;
  const { ID } = req.params;
  const to = stripHtml(req.body.to || '').result;
  const text = stripHtml(req.body.text || '').result;
  const type = stripHtml(req.body.type || '').result;
  const valid = !schema.validate({ username: from, to, text, type }).error;
  if (!valid) {
    return res
      .status(serverAnswers.editMsgs.invalidMsg.code)
      .send(serverAnswers.editMsgs.invalidMsg.message);
  }
  try {
    const message = await messages.findOne({ _id: ObjectId(ID) });
    if (message === null) {
      return res.sendStatus(serverAnswers.editMsgs.msgNotFound.code);
    }
    messages.updateOne({ _id: ObjectId(ID) }, { $set: { to, text, type } });
    return res.sendStatus(serverAnswers.deleteMsgs.msgDeleted.code);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

const port = process.env.PORT || 5000;

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

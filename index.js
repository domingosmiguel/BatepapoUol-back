import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import {
  collectionsName,
  databaseName,
  serverAnswers
} from './assets/const.js';
import { clearHTML, timeUTC } from './assets/functions.js';
import { messageSchema, userSchema } from './assets/schemas.js';

dotenv.config();

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
  const name = clearHTML(req.body.name);
  const valid = !userSchema.validate({ name }).error;
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

server.get('/participants', async (req, res) => {
  try {
    const allUsers = await users.find().toArray();
    return res.send(allUsers);
  } catch (error) {
    return res.sendStatus(serverAnswers.databaseProblem.code);
  }
});

server.post('/messages', async (req, res) => {
  const from = clearHTML(req.headers.user);
  const { to, text, type } = clearHTML(req.body);
  const valid = !messageSchema.validate({ from, to, text, type }).error;
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

server.get('/messages', async (req, res) => {
  const from = clearHTML(req.headers.user);
  const to = from;
  const limit = parseInt(clearHTML(req.query.limit), 10);

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
  const user = clearHTML(req.headers.user);
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
  const user = clearHTML(req.headers.user);
  const ID = clearHTML(req.params.ID);
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
  const ID = clearHTML(req.params.ID);
  const from = clearHTML(req.headers.user);
  const { to, text, type } = clearHTML(req.body);
  const valid = !messageSchema.validate({ from, to, text, type }).error;
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

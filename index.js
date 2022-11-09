import cors from 'cors';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import utc from 'dayjs/plugin/utc.js';
import dotenv from 'dotenv';
import express from 'express';
import { MongoClient } from 'mongodb';

dotenv.config();
dayjs.extend(utc);
dayjs.extend(advancedFormat);
const server = express();
const databaseName = 'batepapoUol';
const collectionsName = {
  usersList: 'user',
  messagesList: 'messages',
};
const serverAnswers = {
  postParticipants: {
    invalidUser: {
      code: 422,
      message: 'Apelido deve ter entre 3 e 20 caracteres',
    },
    userAlreadyExists: {
      code: 409,
      message: 'Usuário já existe',
    },
    userCreated: {
      code: 201,
    },
  },
  postMessages: {
    invalidMessage: {
      code: 422,
      message:
        "'to' e 'text' devem ser strings não vazias, 'type' só pode ser 'message' ou 'private_message', 'from' deve ser um participante existente na lista de participantes.",
    },
    messageCreated: {
      code: 201,
    },
  },
};
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

server.post('/participants', (req, res) => {
  const { name } = req.body;
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
    const timeUTC = dayjs.utc().format('HH:mm:ss');
    const time = dayjs.utc().format('x');
    users.insertOne({ name, lastStatus: time });
    messages.insertOne({
      from: name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: timeUTC,
    });
    return res.sendStatus(serverAnswers.postParticipants.userCreated.code);
  });
});
server.get('/participants', (req, res) => {
  users
    .find()
    .toArray()
    .then((allUsers) => res.send(allUsers));
});

server.post('/messages', (req, res) => {
  const from = req.header.user;
  const { to, text, type } = req.body;
  const valid = true;
  if (!valid) {
    return res
      .status(serverAnswers.postMessages.invalidMessage.code)
      .send(serverAnswers.postMessages.invalidMessage.message);
  }
  const timeUTC = dayjs.utc().format('HH:mm:ss');
  messages.insertOne({
    from,
    to,
    text,
    type,
    time: timeUTC,
  });
  return res.sendStatus(serverAnswers.postMessages.userCreated.code);
});

server.get('/messages', (req, res) => {
  const from = req.header.user;
  const to = from;
  const { numOfMessages } = req.query.limit;

  messages
    .find({ $or: [{ from }, { to }] })
    .toArray()
    .then((allMessages) => res.send(allMessages.slice(-numOfMessages || 0)));
});

server.listen(5000);

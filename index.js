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

server.listen(5000);

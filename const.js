const databaseName = 'batepapoUol';

const collectionsName = {
  usersList: 'users',
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
  postMsgs: {
    invalidMsg: {
      code: 422,
      message:
        "'to' e 'text' devem ser strings não vazias, 'type' só pode ser 'message' ou 'private_message', 'from' deve ser um participante existente na lista de participantes.",
    },
    msgCreated: {
      code: 201,
    },
  },
  postStatus: {
    userNotFound: {
      code: 404,
    },
    statusUpdated: {
      code: 200,
    },
  },
  deleteMsgs: {
    msgNotFound: {
      code: 404,
    },
    userNotOwner: {
      code: 401,
    },
    msgDeleted: {
      code: 200,
    },
  },
  editMsgs: {
    invalidMsg: {
      code: 422,
      message:
        "'to' e 'text' devem ser strings não vazias, 'type' só pode ser 'message' ou 'private_message', 'from' deve ser um participante existente na lista de participantes.",
    },
    msgNotFound: {
      code: 404,
    },
    userNotOwner: {
      code: 401,
    },
    msgEdited: {
      code: 200,
    },
  },
};

export { databaseName, collectionsName, serverAnswers };

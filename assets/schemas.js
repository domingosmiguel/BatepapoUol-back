import Joi from 'joi';

const userSchema = Joi.object({
  name: Joi.string().min(3).max(20),
});

const messageSchema = Joi.object({
  from: Joi.string().min(3).max(20),
  to: Joi.string().min(3).max(20),
  text: Joi.string().min(1).max(280),
  type: Joi.string().pattern(/^(message|private_message)$/),
});

export { userSchema, messageSchema };

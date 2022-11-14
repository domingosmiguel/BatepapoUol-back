import Joi from 'joi';

const userSchema = Joi.object({
  name: Joi.string().min(3).max(20).required(),
});

const messageSchema = Joi.object({
  from: Joi.string().min(3).max(20).required(),
  to: Joi.string().min(3).max(20).required(),
  text: Joi.string().min(1).max(280).required(),
  type: Joi.string()
    .pattern(/^(message|private_message)$/)
    .required(),
});

export { userSchema, messageSchema };

import joi from 'joi'

const participantSchema = joi.object({
  name: joi.string().trim().min(3).required()
});

const messageSchema = joi.object({
    to: joi.string().trim().min(3).required(),
    text: joi.string().trim().required(),
    type: joi.valid('message','private_message').required()
  });

function validateParticipant(participantData) 
{
    const validation = participantSchema.validate(participantData, { abortEarly: false });
    if(validation.error)
    {
        return {
            hasErrors: true,
            errors: validation.error.details.map(err => err.message)
        }
    }
    else
    {
        return {
            hasErrors: false
        }
    }
}

function validateMessage(messageData)
{
    const validation = messageSchema.validate(messageData, { abortEarly: false });
    if(validation.error)
    {
        return {
            hasErrors: true,
            errors: validation.error.details.map(err => err.message)
        }
    }
    else
    {
        return {
            hasErrors: false
        }
    }
}

export {
    validateParticipant,
    validateMessage
}
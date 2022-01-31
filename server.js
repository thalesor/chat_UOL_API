import express, { json } from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br.js';
import { dbService } from './services/db-service.js';
import { ObjectId } from "mongodb";
import { validateParticipant, validateMessage } from './services/joi-service.js';

const app = express();
dayjs.locale('pt-br');
app.use(json());
app.options('*', cors());
app.use(cors());

///////////////////////////////////////////////////////////////////////////////////////SERVER ROUTES

app.get('/participants', async (req, res)=> {
    try 
    {
        const participants = await dbService.find("participants", {});
        if(participants.length)
        {
            res.status(200).send(participants);
            return
        }
    
        res.status(500).send(`Erro no servidor ao tentar obter a lista de participantes
        ou simplesmente não há participantes logados`);
    }
    catch(err)
    {
        res.status(500).send(err);
    }	
});

app.get('/messages', async (req, res)=> {
    try 
   {
       const { limit } = req.query;
       const currentParticipant = req.header('User');
       const messages = await dbService.findMessages(limit, currentParticipant);
       if(messages.length)
       {
          return  res.status(200).send(messages.reverse());
       }

       res.status(500).send("Erros no servidor, não será possível retornar as mensagens dos usuários");
   }
   catch(err)
   {
       res.status(500).send(err);
   }	
});

app.post('/participants', async (req, res)=> {
	const { name } = req.body;
    const validation = validateParticipant(req.body);
    if(validation.hasErrors === false)
    {
        try
        {
            const participant = await matchParticipant(req.body);
            if(!participant.length)
            {
                const returnedUser = await dbService.insert("participants",
                {...req.body, lastStatus: Date.now()}
                );
                if(returnedUser)
                {
                    const returnedMessage = await dbService.insert("messages",
                    {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: rightNow()}
                    );

                    if(returnedMessage)
                        res.sendStatus(201);
                    else
                        res.status(500).send("Erros no servidor, durante o cadastro do participante");
            
                    return
                }
                return res.status(500).send("Erros no servidor, durante o cadastro do participante");

                
            }
                res.status(409).send(`Já existe um usuário cadastrado com o nome ${name}`);
        }
        catch(err)
        {
            res.sendStatus(500);
        } 

        return
    }
    
        res.status(422).send(`erros durante a validação do usuário :
        ${validation.errors}`);
});

app.post('/messages', async (req, res)=> 
{
    try
    {
        const validation = validateMessage(req.body);
        if(validation.hasErrors === false)
        {
            
            const fromParticipant = req.header('User');
            const participants = await matchParticipant({ name: fromParticipant });
            if(participants.length)
            {
                const returnedMessage = await dbService.insert("messages",
                {...req.body, from: fromParticipant, time: rightNow()});
                if(returnedMessage)
                    res.sendStatus(201);
                else
                    res.status(500).send("Erros no servidor, não foi possível inserir a mensagem");
            
                return
            }
                return res.status(422).send("Erro! O usuário não está mais logado, não será possível enviar a mensagem");

                
        }
        res.status(422).send(`Erros durante a validação da mensagem:
        ${validation.errors}`);
    }
    catch(err)
    {
        res.status(500).send(err);
    } 
});

app.post('/status', async (req, res)=> {
	const currentParticipant = req.header('User');
    const existsParticipant = await matchParticipant({ name: currentParticipant });
    if(existsParticipant.length)
    {
        const returnedStatus = await dbService.update("participants",
         { name: currentParticipant } ,
         { lastStatus: Date.now() });
        if(returnedStatus)
        res.send(200);
        else
        res.status(500).send("Erro no servidor, falha ao atualizar o status do usuário");

        return
    }
    res.send(404); 
});

app.delete('/messages/:MESSAGE_ID', async (req, res)=> {
	const idMessage = req.params.MESSAGE_ID;
    const currentParticipant = req.header('User');
    const matchMessage = await dbService.find("messages", { _id: new ObjectId(idMessage) });
    if(matchMessage.length)
    {
            if(matchMessage[0].from !== currentParticipant)
            {
               return res.status(401).send("Erro no servidor, o dono da mensagem não está mais logado");
            }
        
            const returnedRemovedMessage = await dbService.deleteMany("messages", { _id: new ObjectId(idMessage) });
            if(returnedRemovedMessage)
            {
               return  res.sendStatus(200);
            }
    
            return res.status(500).send("Erro no servidor, falha ao tentar deletar a mensagem");
    }
    
    res.status(404).send("Erro no servidor, a mensagem não foi encontrada");
});

app.put('/messages/:MESSAGE_ID', async (req, res)=> {
    if(req.body)
    {
        const idMessage = req.params.MESSAGE_ID;
        const currentParticipant = req.header('User');
        const matchMessage = await dbService.find("messages",
        { _id: new ObjectId(idMessage) });
        if(matchMessage.length)
        {
            if(matchMessage[0].from !== currentParticipant)
            {
                return res.status(401).send("Erro no servidor, o dono da mensagem não está mais logado");
            }
        
            const returnedEditedMessage = await dbService.update("messages",
            { _id: new ObjectId(idMessage) },
            {...req.body}
            );
            if(returnedEditedMessage)
            {
                return res.sendStatus(200);
            }
    
           return res.status(500).send("Erro no servidor, falha ao tentar editar a mensagem");
            
        }
           return res.status(404).send("Erro no servidor, a mensagem não foi encontrada");
           
        
       
    }
	res.status(500).send("Erro no servidor, falha ao tentar editar a mensagem");
});




////////////////////////////////////////////////////////////////////////////////////////////UTILS

const matchParticipant = (data) =>
{
    const participants = dbService.find("participants",
               data
            );
    return participants;
}

const rightNow = () =>
{
    return dayjs().format('HH:mm:ss');
}

const isStillActive = (timeToCompare) => 
{
    if((Date.now() - timeToCompare)/ 1000 <= 10)
    return true;
    else
    return false;
}

//The part that kicks every inactive participant out of the chat room
setInterval(async () => {
    const participants = await dbService.find("participants", {});
    const toBeKickedData = participants.filter(p=> !isStillActive(p.lastStatus));
    if(toBeKickedData.length)
    {
        const kickMessages = toBeKickedData.map(p=> ( {from: p.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: rightNow()} ));
        const kickParticipants = toBeKickedData.map(p=> ( {  _id: new ObjectId(p._id) } ));

        const rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo = await dbService.deleteMany("participants", ...kickParticipants);
        if(rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo)
            dbService.insertMany("messages", kickMessages);
    }
}, 15000);

app.listen('5000', (port) => {
	console.log(`Server running :^)`);
});
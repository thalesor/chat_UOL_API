import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br.js';
import { dbService } from './services/db-service.js';
import { ObjectId } from "mongodb";
import { validateParticipant, validateMessage } from './services/joi-service.js';

const app = express();
dayjs.locale('pt-br');
app.use(express.json());
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
                res.status(500).send("Erros no servidor, durante o cadastro do participante");

                return
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
    return dayjs().format('HH:MM:ss');
}

app.listen('5000', (port) => {
	console.log(`Server running :^)`);
});
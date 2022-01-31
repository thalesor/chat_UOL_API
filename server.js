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


app.listen('5000', (port) => {
	console.log(`Server running :^)`);
});
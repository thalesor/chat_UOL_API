import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dayjs from 'dayjs';

const mongoClient = new MongoClient("mongodb://localhost:27017");
const app = express();

app.use(express.json());
app.options('*', cors());
app.use(cors());

app.get('/participants', async (req, res)=> {
	await mongoClient.connect();
    console.log("banco conectado");
    const participants = await mongoClient.db("bate_papo_uol").collection("participants").find().toArray();
    res.send(participants);
    mongoClient.close();
});

app.get('/messages', (req, res)=> {
    
});

app.post('/participants', async (req, res)=> {
	const { name } = req.body;
    //change to joi validation, find a way to treat any error that may appear
    if(name)
    {
        try
        {
            await mongoClient.connect();
            console.log("connected to database");
            const matchParticipant = await mongoClient.db("bate_papo_uol").collection("participants").find(req.body).toArray();
            if(matchParticipant.length)
            {
                res.sendStatus(409);
                mongoClient.close();
                return;
            } 
            const returnedParticipant = await mongoClient.db("bate_papo_uol").collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            });

            if(returnedParticipant.acknowledged)
            console.log("inserted participant");

            const returnedMessage = await mongoClient.db("bate_papo_uol").collection("messages").insertOne(
                {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:MM:SS')}
            );

            if(returnedMessage.acknowledged)
            console.log("inserted message");

            res.sendStatus(201);
            mongoClient.close();
        }
        catch(err)
        {
            res.status(500);
            res.send(err);
            mongoClient.close();
        } 
    }
    else
    {
        res.send(422);
        mongoClient.close();
    }
});

app.post('/messages', (req, res)=> {
	const { tweet } = req.body;
    
});

app.post('/status', (req, res)=> {
	const { tweet } = req.body;

});


app.listen('5000', () => {
	console.log('Server is ready to rock 😆');
});
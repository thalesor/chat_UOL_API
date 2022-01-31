import express from 'express';
import cors from 'cors';

const app = express();
dayjs.locale('pt-br');
app.use(express.json());
app.options('*', cors());
app.use(cors());


app.listen('5000', (port) => {
	console.log(`Server running :^)`);
});
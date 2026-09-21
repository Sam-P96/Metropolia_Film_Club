import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import tmdbRoutes from './routes/tmdb.js'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/tmdb', tmdbRoutes)

app.get('./api/health', (req, res) => {
    res.json({status : 'ok'})
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
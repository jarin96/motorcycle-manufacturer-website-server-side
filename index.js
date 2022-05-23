const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://welbim_manufacturing:<password>@cluster0.dhojc.mongodb.net/?retryWrites=true&w=majority";

app.get('/', (req, res) => {
    res.send('Hello from Welbim!')
})

app.listen(port, () => {
    console.log(`Welbim app listening on port ${port}`)
})
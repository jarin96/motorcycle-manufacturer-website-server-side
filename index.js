const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dhojc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('welbim_website').collection('parts');
        const userCollection = client.db('welbim_website').collection('users');

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        });

        //For every email address user create
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // For my orders
        app.get('/parts', async (req, res) => {
            const orderer = req.query.orderer;
            const query = { orderer: orderer };
            const parts = await partsCollection.find(query).toArray();
            res.send(parts);
        })



        // Quantity increase/Decrease
        app.put('/updateQuantity/:id', async (req, res) => {
            // console.log(req.body);
            const filter = { _id: ObjectId(req.params.id) };
            // console.log(filter);
            const updateDoc = {
                $set: {
                    minimumquantity: req.body.minimumquantity,
                    availablequantity: req.body.availablequantity
                },
            };
            const result = await partsCollection.updateOne(filter, updateDoc);
            res.send(result);
            // console.log(req.params.id);

        })


        // purchase id 
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            // const query = { _id: ObjectId(id) };
            const part = await partsCollection.findOne({ _id: ObjectId(id) });
            res.send(part);

        });
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Welbim!')
})

app.listen(port, () => {
    console.log(`Welbim app listening on port ${port}`)
})
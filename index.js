const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dhojc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('welbim_website').collection('parts');
        const userCollection = client.db('welbim_website').collection('users');
        const reviews = client.db('welbim_website').collection('reviews');
        const orders = client.db('welbim_website').collection('orders');
        const profile = client.db('welbim_website').collection('profile');

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        });

        // Payment
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })



        // User Admin
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }

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
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });

        // ALL Users
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })
        app.get('/reviews', async (req, res) => {
            const reviewer = await reviewCollection.find().toArray();
            res.send(reviewer);

        })





        // For my orders
        app.get('/parts', async (req, res) => {
            const orderer = req.query.orderer;
            const query = { orderer: orderer };
            const parts = await partsCollection.find(query).toArray();
            res.send(parts);
        })
        // POST for Add a review in client side
        app.post('/parts', async (req, res) => {
            const newData = req.body;
            const result = await partsCollection.insertOne(newData);
            res.send(result);
        })
        // delete a manage product
        app.delete('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(query);
            res.send(result);
        })

        // Review 
        app.post('/addReview', async (req, res) => {
            const result = await reviews.insertOne(req.body);
            res.send(result);
        })
        // Profile
        app.post('/addInfo', async (req, res) => {
            const result = await profile.insertOne(req.body);
            res.send(result);
        })
        // profile update
        app.put('/updateInfo/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: req.body
            };
            const result = await profile.updateOne(filter, updateDoc);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });


        // Review get
        app.get('/findReview', async (req, res) => {
            const result = await reviews.find({}).toArray();
            // console.log(result);
            res.send(result);
        })

        app.get('/updateInfo/:id', async (req, res) => {
            const id = req.params.id;
            // const query = { _id: ObjectId(id) };
            const part = await profile.findOne({ _id: ObjectId(id) });
            res.send(part);

        });
        // Order Place

        app.post('/confirmOrder', async (req, res) => {
            const result = await orders.insertOne(req.body);
            res.send(result);
        })

        // Find Individual orders
        app.get('/myOrder/:email', async (req, res) => {
            const userEmail = { email: req.params.email };
            const result = await orders.find(userEmail).toArray();
            res.send(result);

        })

        app.get('/myOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orders.findOne(query);
            res.send(order);
        })

        // cancel order
        app.delete('/deleteProduct/:id', async (req, res) => {
            // console.log(req.params.id);
            const product = {
                _id: ObjectId(req.params.id)
            }

            console.log(req.params.id);
            const result = await orders.deleteOne(product);
            res.send(result);
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
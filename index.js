const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://foodsDBUser:jTKLhnG69z8FwDk5@cluster0.1z9sk8c.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("foodsDBUser");
    const foodsCollection = db.collection("foods");
    const foodsRequestCollection = db.collection("food-request");

    app.get("/foods", async (req, res) => {
      const cursor = foodsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/foods/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    app.get("/my-foods", async (req, res) => {
      const email = req.query.email;
      const result = await foodsCollection
        .find({ donators_email: email })
        .toArray();
      res.send(result);
    });

    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: data,
      };
      const result = await foodsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    // app.delete("/foods/:id");
    // async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await foodsCollection.deleteOne(query);
    //   res.send(result);
    // };

    app.post("/foods", async (req, res) => {
      const data = req.body;
      const result = await foodsCollection.insertOne(data);
      res.send(result);
    });

    app.post("/food-request", async (req, res) => {
      const data = req.body;
      const result = await foodsRequestCollection.insertOne(data);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

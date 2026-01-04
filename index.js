const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.1z9sk8c.mongodb.net/?appName=Cluster0`;

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
    // await client.connect();

    const db = client.db("foodsDBUser");
    const foodsCollection = db.collection("foods");
    const foodCollection = db.collection("food");
    const foodsRequestCollection = db.collection("food-request");
    const usersCollection = db.collection("users");

    app.get("/foods", async (req, res) => {
      try {
        let {
          search = "",
          location = "",
          sort = "expire_date",
          order = "asc",
          page = 1,
          limit = 8,
        } = req.query;

        page = Number(page) || 1;
        limit = Number(limit) || 8;
        order = order === "desc" ? -1 : 1;

        // Only apply regex if search/location is not empty
        const query = { food_status: "Available" };
        if (search) query.food_name = { $regex: search, $options: "i" };
        if (location)
          query.pickup_location = { $regex: location, $options: "i" };

        const skip = (page - 1) * limit;

        const sortQuery = {};
        sortQuery[sort] = order;

        const foods = await foodsCollection
          .find(query)
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .toArray();
        const total = await foodsCollection.countDocuments(query);

        res.status(200).json({ foods, total });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    // ==========================
    app.get("/total-foods", async (req, res) => {
      const {
        search = "",
        location = "",
        sort = "expire_date",
        order = "asc",
      } = req.query;

      const query = {
        $or: [
          { food_name: { $regex: search, $options: "i" } },
          { donators_email: { $regex: search, $options: "i" } },
          { location: { $regex: location, $options: "i" } },
        ],
      };

      const sortQuery = { [sort]: order === "asc" ? 1 : -1 };

      const foods = await foodsCollection.find(query).sort(sortQuery).toArray();
      res.send({ foods, total: foods.length });
    });

    app.get("/highest-foods", async (req, res) => {
      const cursor = foodsCollection.find().sort({ food_qty: -1 }).limit(8);
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

    app.post("/foods", async (req, res) => {
      const data = req.body;
      const result = await foodsCollection.insertOne(data);
      res.send(result);
    });
    app.post("/food", async (req, res) => {
      const data = req.body;
      const result = await foodCollection.insertOne(data);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      if (!user?.email) {
        return res.status(400).json({ message: "Email required" });
      }

      const existingUser = await usersCollection.findOne({
        email: user.email,
      });

      if (existingUser) {
        return res.json({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.json(result); // ⚠️ res.send না, res.json
    });

    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);

      res.send({ role: user?.role || "user" });
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/role/:id", async (req, res) => {
      const { role } = req.body;
      const id = req.params.id;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );

      res.send(result);
    });

    // GET /request-food with optional search
    app.get("/request-food", async (req, res) => {
      try {
        const { q } = req.query; // ?q=searchTerm
        let query = {};

        if (q) {
          // Search by name, email, location, status (case-insensitive)
          query = {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { email: { $regex: q, $options: "i" } },
              { location: { $regex: q, $options: "i" } },
              { status: { $regex: q, $options: "i" } },
            ],
          };
        }

        const result = await foodsRequestCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to fetch food requests" });
      }
    });

    app.post("/food-request", async (req, res) => {
      const data = req.body;
      const result = await foodsRequestCollection.insertOne(data);
      res.send(result);
    });

    app.get("/food-request/:foodId", async (req, res) => {
      const { foodId } = req.params;
      const requests = await foodsRequestCollection.find({ foodId }).toArray();
      res.send(requests);
    });

    app.get("/my-request", async (req, res) => {
      const email = req.query.email;
      const result = await foodsRequestCollection
        .find({ email: email })
        .toArray();
      res.send(result);
    });

    // ------------------ Dashboard API ------------------
    app.get("/user-dashboard/:email", async (req, res) => {
      try {
        const email = req.params.email;
        console.log("Dashboard request for:", email);

        // 1️⃣ Total foods added by this user
        const totalAdded = await foodsCollection.countDocuments({
          donators_email: email,
        });

        // 2️⃣ Status-wise counts
        const available = await foodsCollection.countDocuments({
          donators_email: email,
          food_status: "Available",
        });
        const delivered = await foodsCollection.countDocuments({
          donators_email: email,
          food_status: "Delivered",
        });
        const expired = await foodsCollection.countDocuments({
          donators_email: email,
          food_status: "Expired",
        });

        // 3️⃣ Total food requests made by this user
        const totalRequested = await foodsRequestCollection.countDocuments({
          email: email,
        });

        // 4️⃣ Recent Foods (latest 5 added)
        const recentFoods = await foodsCollection
          .find({ donators_email: email })
          .sort({ created_at: -1 })
          .limit(5)
          .toArray();

        // 5️⃣ Monthly Foods Added (all months)
        const foods = await foodsCollection
          .find({ donators_email: email })
          .toArray();
        const monthlyCounts = Array(12).fill(0);
        foods.forEach((food) => {
          const month = new Date(food.created_at).getMonth();
          monthlyCounts[month]++;
        });

        res.send({
          totalAdded,
          totalRequested,
          chartData: [
            { name: "Available", value: available },
            { name: "Delivered", value: delivered },
            { name: "Expired", value: expired },
          ],
          recentFoods, // 🔹 latest 5 foods
          monthlyCounts, // 🔹 0-11 month counts
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Dashboard data error" });
      }
    });

    // Accept food request → update request + food status
    app.patch("/food-request/accept/:requestId", async (req, res) => {
      try {
        const requestId = req.params.requestId;
        const foodRequest = await foodsRequestCollection.findOne({
          _id: new ObjectId(requestId),
        });
        if (!foodRequest) {
          return res.status(404).send({ message: "Request not found" });
        }
        const foodId = foodRequest.foodId;
        // food-request collection status  update
        await foodsRequestCollection.updateOne(
          { _id: new ObjectId(requestId) },
          { $set: { status: "accepted" } }
        );

        //  foods collection  status update
        await foodsCollection.updateOne(
          { _id: new ObjectId(foodId) },
          { $set: { status: "donated" } }
        );
        res.send({ message: "Food request accepted and food donated!" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.patch("/food-request/reject/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: { status: "rejected" },
      };
      const result = await foodsRequestCollection.updateOne(query, update);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const { status } = require("init");

//DB Setup
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "dvdrental",
    password: "postgres",
    port: 5432, // default PostgreSQL port
});

//Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//Routes

//Get all customers
app.get("/all-customers", async (req, res, next) => {
    try {
        const client = await pool.connect();
        const sql =
            "SELECT * FROM customer INNER JOIN address ON customer.address_id = address.address_id INNER JOIN city ON address.city_id = city.city_id INNER JOIN country ON city.country_id = country.country_id";
        const result = await client.query(sql);
        const customers = result.rows;
        client.release();
        res.status(200).json(customers);
    } catch (err) {
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Search customer by name
app.post("/search-customers", async (req, res, next) => {
    try {
        const client = await pool.connect();
        const { searchTerm } = req.body;
        const sql = `SELECT * FROM customer INNER JOIN address ON customer.address_id = address.address_id INNER JOIN city ON address.city_id = city.city_id INNER JOIN country ON city.country_id = country.country_id WHERE LOWER(first_name) LIKE LOWER('%${searchTerm}%') OR LOWER(last_name) LIKE LOWER('%${searchTerm}%')`;
        const result = await client.query(sql);
        const customers = result.rows;
        client.release();
        res.status(200).json(customers);
    } catch (err) {
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Search customer ny id
app.post("/search-customers-id", async (req, res, next) => {
    try {
        const client = await pool.connect();
        const { searchTerm } = req.body;
        const sql = `SELECT * FROM customer INNER JOIN address ON customer.address_id = address.address_id INNER JOIN city ON address.city_id = city.city_id INNER JOIN country ON city.country_id = country.country_id WHERE customer_id = ${searchTerm}`;
        const result = await client.query(sql);
        const customers = result.rows;
        client.release();
        res.status(200).json(customers);
    } catch (err) {
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Get rentals by customer
app.post(`/customer-rentals`, async (req, res) => {
    try {
        const client = await pool.connect();
        let { customerId } = req.body;
        console.log(customerId);

        let sql = `SELECT * 
        FROM rental 
        INNER JOIN inventory ON rental.inventory_id = inventory.inventory_id
        INNER JOIN film ON inventory.film_id = film.film_id
        WHERE customer_id = ${customerId}`;

        const result = await client.query(sql);
        const rentals = result.rows;
        client.release();
        res.status(200).json(rentals);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

//Get all cities
app.get(`/all-cities`, async (req, res) => {
    try {
        const client = await pool.connect();

        let sql = `SELECT *
        FROM public.city`;
        const result = await client.query(sql);
        const cities = result.rows;

        client.release();
        res.status(200).json(cities);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

//Create a new customer
app.post(`/new-customer`, async (req, res) => {
    try {
        const client = await pool.connect();
        let customer = req.body;
        let addressSql = `INSERT INTO public.address(
            address, address2, city_id, postal_code, phone )
            VALUES ( '${customer.address}', '${customer.address2}', ${customer.city}, '${customer.postal_code}', '${customer.phone}' ) returning address_id`;

        await client
            .query(addressSql)
            .then(async (resp) => {
                console.log(resp.rows.address_id);
                const address_id = resp.rows[0].address_id;
                let customerSql = `INSERT INTO public.customer(
                    store_id, first_name, last_name, email, address_id)
                    VALUES ( ${customer.store_id}, '${customer.first_name}', '${customer.last_name}', '${customer.email}', ${address_id})`;
                console.log(customerSql);
                await client
                    .query(customerSql)
                    .then((resp) => {
                        console.log("Customer created");
                    })
                    .catch((err) => console.log(err));
            })
            .catch((err) => console.log(err));

        console.log(req.body);
        console.log(addressSql);

        res.status(201);
    } catch (err) {
        console.log(err);
        res.status(500);
    }
});

//Port Setup
const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

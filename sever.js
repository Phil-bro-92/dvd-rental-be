//Packages
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const { status } = require("init");
const Postal = require("@atech/postal");
let postalClient = new Postal.Client(
    "https://postal.yourdomain.com",
    "your-api-key"
);

//PG DB Setup
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

//Login staff member
app.post(`/login`, async (req, res) => {
    try {
        const body = req.body;
        console.log(body);
        const client = await pool.connect();
        let checkExistsSQL = `SELECT *
        FROM staff WHERE email = '${body.email}'`;

        await client
            .query(checkExistsSQL)
            .then(async (resp) => {
                if (resp.rows.length > 0) {
                    console.log("here");
                    console.log(resp.rows[0].password);
                    console.log(body.password);
                    const isMatch = await bcrypt.compare(
                        resp.rows[0].password,
                        body.password
                    );
                    console.log(isMatch);
                    if (isMatch) {
                        res.status(200).json({ message: "Successful login" });
                    } else {
                        res.status(401).json({ message: "Not authorized" });
                    }
                } else {
                    res.status(204).json({ message: "User does not exist" });
                }
            })
            .catch((err) => {
                console.log(err);
            });
    } catch (err) {
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Get all customers
app.get("/all-customers", async (req, res) => {
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
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
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
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
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

        let checkExistsSQL = `SELECT email
        FROM customer WHERE email = '${req.body.email}'`;

        await client
            .query(checkExistsSQL)
            .then(async (resp) => {
                if (resp.rows.length == 0) {
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
                } else {
                    res.status(409).json({
                        message: "Customer email already exists",
                    });
                }
            })
            .catch((err) => {
                console.log(err);
            });

        res.status(201).json({ message: "Customer added" });
    } catch (err) {
        console.error("Error executing query", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Get all movies
app.get(`/all-movies`, async (req, res) => {
    try {
        let movies = [];
        const client = await pool.connect();
        const sql = `SELECT film.film_id AS film_id, title, description, release_year, rental_duration, rental_rate, length, replacement_cost, rating, special_features, language.name AS language, category.name as category           FROM film 
            INNER JOIN language 
            ON film.language_id = language.language_id
            INNER JOIN film_category 
            ON film.film_id = film_category.film_id 
            INNER  JOIN category
            ON film_category.category_id = category.category_id`;
        await client
            .query(sql)
            .then(async (resp) => {
                for (let m = 0; m < resp.rows.length; m++) {
                    let movie = resp.rows[m];

                    let actorsSql = `SELECT actor.actor_id, first_name, last_name 
                    FROM film
                    INNER JOIN film_actor
                    ON film.film_id = film_actor.film_id
                    INNER JOIN actor
                    ON film_actor.actor_id = actor.actor_id WHERE film.film_id = ${resp.rows[m].film_id}`;
                    const actors = await client
                        .query(actorsSql)
                        .then((actorResp) => {
                            movie.actors = actorResp.rows;
                            movies.push(movie);
                        })
                        .catch((err) => {
                            console.error("Error executing query", err);
                            res.status(500).json({
                                error: "Internal Server Error",
                            });
                        });
                }
            })
            .catch((err) => {
                console.error("Error executing query", err);
                res.status(500).json({ error: "Internal Server Error" });
            });

        client.release();
        res.status(200).json(movies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Search movie by name

//Get Movie Inventory
app.post(`/movie-inventory`, async (req, res) => {
    try {
        const client = await pool.connect();
        let inventory = 0;
        const { filmId } = req.body;
        const sql = `SELECT film_id, COALESCE(COUNT(*), 0) AS inventory
        FROM inventory
        WHERE film_id = ${filmId}
        GROUP BY film_id`;

        await client
            .query(sql)
            .then((resp) => {
                if (resp.rows) {
                    inventory = resp.rows[0].inventory;
                }
            })
            .catch((err) => {
                console.error("Error executing query", err);
                res.status(500).json({
                    error: "Internal Server Error",
                });
                inventory = 0;
            });
        client.release();
        res.status(200).json({ inventory: inventory });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Port Setup
const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

* Express's benefits (lightweight abstraction, routing/middleware/responses, separation of concerns, unopinionated for APIs/microservices)

* Pitfall: Without express.json(), req.body is undefined. Think: "Request in → Middleware  process → Route handle → Response out.

* full code setup (app, middleware, routes). From first principles: Start with express() instance (base server), add app.use(express.json()) (parse input), then routes for GET/POST (handle req/res flow).

* Raw Node is low-level (e.g., no built-in routing, body parsing), leading to boilerplate/errors. Express reduces code by 50-70% for APIs.


const express = requires('express');

const app = express();

// with middleware and param
app.use(express.json()); // parse JSON bodies

app.post('/user' , (req, res)=>{
	const name = req.body.name // access body
	res.json({message: `Hello, ${name}`});
});

app.get('/user/:id', (req, res)=>{
	const id = req.param.id; // access URL Param
	res.send(`User ID: ${id}`);
})
app.get('/', (req,res)=>{
	res.send("Hello worl!"); // Send response

})


app.use(express.json());
app.post('/data', (req,res)=>{
	cosole.log(req.body); // {key: 'value'}
	res.status(200).send('OK')
})

Practice example:
Setting up a simple Express API with two routes: GET /users (returns JSON array of users) and POST /users (adds a user from body, returns updated array). Use middleware for JSON parsing. Explain from first principles why Express is better than raw Node HTTP for this.
(Provide full code. Assume in-memory users array for simplicity.)

full code setup (app, middleware, routes):
From first principles: 
Start with express() instance (base server), add app.use(express.json()) (parse input), then routes for GET/POST (handle req/res flow). Use in-memory array for users.

const express = requires('express);
const app = express();
let users = []; // In-memory array

app.use(express.json()); // Middleware: parse Json bodies

app.get('/users', (req, res) => {
	res.json(users); //Return array as JSON

});

app.post('/users', (req, res)=>{
	const newUser = req.body; // get from body
	users.push(newUser); // add
	res.json(users); // return updated
})
PORT = 3000;
app.listen(PORT, ()=> console.log('Server runnnig at port ${PORT}`));

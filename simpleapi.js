// production example: Basic express API for users
// This abstracts HTTP flow (req in → parse → route match → logic → res out), preventing raw Node's manual stream handling. 
// Pitfall: No parsing middleware = undefined bodies; always add for APIs.
const express  = require('express');
const app = express();

let users = [{id: 1, name: 'John Doe'}, {id:2, name: 'Jane Doe'}]; // in-memory array to store users

app.use(express.json()); // Middleware: Parse bodies (essentiall for POST/PUT requests) 

// Get all users
app.get('/users', (req, res)=>{
	res.json(users);
})

// POST new user
app.post('/users', (req, res)=>{
	const { name } = req.body; // Access parsed body
	if (!name) return res.status(400).json({error: 'Name is required'}); // Basic validation
	const newUser = {id: users.length + 1, name}; // Create new user
	users.push(newUser);
	res.status(201).json(newUser); // Respond with created user

})

// Get user by ID
app.get('/users/:id', (req, res) => {
	const user = users.find(u => u.id === parseInt(req.params.id));
	if (!user) return res.status(404).json({error: 'User not found'});
	res.json(user);

})

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
// To test this API, you can use curl or Postman to make requests to the endpoints:
// curl http://localhost:3000/users
// curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name": "Alice"}'

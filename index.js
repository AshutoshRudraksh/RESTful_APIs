// import express which represents a function for creating a new express application
const express = require('express');
const app = express();
const PORT = 8080;

// middleware to parse json body here express.json() is a built-in middleware function in express
// let's set up middleware to handle 404 errors; which tells express to parse the json body of incoming requests before it hits any of our route handlers
// its the shared code that runs before any of our route handlers

app.use(express.json()); // to parse the body of the request


// the req parameter represents the request object that help us to access the request data
// the res parameter represents the response object that help us to send the response data

//Noet: express does not parse the body by default, we need to use middleware to parse the body
// here we are creating a route for the root path
app.get('/tshirt', (req, res) => {
	res.status(200).send({
		tshirt: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZxUeosouALU26EoA0bj4Byvrg_Zyylw6s_Q&s',
	})
})
// Pro Tip - How to make API request from :
// curl http://localhost:8080/
// use rest client to make API request client like postman or insomnia
// we'll use insomnia rest client to make API request

// with post request we can send data to the server i.e, the user is creating a new data on the server
// and the parameter is the id of the tshirt and is accessed using the req.params object

app.post('/tshirt/:id',(req, res) =>{

	// extract the id from the request parameters
	//const {tshirt} = req.params;
	const {id} = req.params;
	const {logo} = req.body; // extract the logo from the request body
	// remember that the requrest parameters help us to access the data from body, headers, query string, and url params
	// the body is used to send data to the server
	// the headers are used to send metadata to the server
	// the query string is used to send data to the server in the url
	// the url params are used to send data to the server in the url

	// once we have the id we can use it to create a new data on the server
	// if (!id) {
	// 	return res.status(418).send({message : 'id is required!'}); //  diffrenece between message and error: 
	// }
	if (!logo){
		res.status(500).send({message : 'logo is required!'});
	}
	res.send({
		tshirt: `tshirt with id ${logo} with id:${id} created successfully!`
	})

});



//listen for requests on port 8080
app.listen(
	PORT,
	() => console.log(`Server is running on port ${PORT}, and is alive on http://localhost:${PORT}`)
)


// PS:  use swaggerhub.com to document the API to understand
// app.swaggerhub.com
// https://swagger.io/tools/swaggerhub/	

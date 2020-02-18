// modules
const express = require('express');
const session = require('express-session');
const request = require('request');

// App initialization
const app = express();
app.set('view engine', 'pug');
const port = 9000;

// FusionAuth info (copy from FusionAuth dashboard)
const clientID = '5603c20d-3e32-4971-b7eb-8e9f023fc524';
const clientSecret = 'viCMOPW73hlUVyE4ja_sOdL5rGEU4GuVFY_yuy8rJ7A';
const redirectURI = 'http://localhost:9000/oauth-redirect';

// session config
app.use(session({
	secret: '1234567890',
	resave: false,
	saveUninitialized: true
}));

// method for clearing cookies and session data
function endSession(req, res) {
	res.status(200).clearCookie('JSESSIONID');
	req.session.destroy();
}

// root page
app.get('/', (req, res) => {

	if (req.session.token) {

		request(

			// POST request to /introspect endpoint
			{
				method: 'POST',
				uri: 'http://localhost:9011/oauth2/introspect',
				headers: {
					'content-type': 'application/x-www-form-urlencoded'
				},
				qs: {
					'client_id': clientID,
					'token': req.session.token
				}
			},

			// callback
			(error, response, body) => {

				if (!JSON.parse(body).active) {
					endSession(req, res);
				}

				res.render('index', { body: JSON.parse(body) });
			}
		);
	}

	else {
		res.render('index');
	}
});

// log in
app.get('/login', (req, res) => {
	res.redirect(`http://localhost:9011/oauth2/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=code`);
});
app.get('/oauth-redirect', (req, res) => {

	request(

		// POST request to /token endpoint
		{
			method: 'POST',
			uri: 'http://localhost:9011/oauth2/token',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			qs: {
				'client_id': clientID,
				'client_secret': clientSecret,
				'code': req.query.code,
				'grant_type': 'authorization_code',
				'redirect_uri': redirectURI
			}
		},

		// callback
		(error, response, body) => {

			// save token to session
			req.session.token = JSON.parse(body).access_token;

			// redirect to root
			res.redirect('/');
		}
	);
});

// log out
app.get('/logout', (req, res) => {

	request(

		// GET request to /logout endpoint
		{
			method: 'GET',
			uri: 'http://localhost:9011/oauth2/logout',
			qs: `client_id=${clientID}`
		},

		// callback
		(error, response, body) => {

			// clear cookie and session (otherwise, FusionAuth will remember the user)
			endSession();

			// redirect to root
			res.redirect('/');
		}
	);
});

// start app
app.listen(port, () => console.log(`Example app listening on port ${port}.`));

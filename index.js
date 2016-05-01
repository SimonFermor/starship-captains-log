var express = require('express');
var markdown = require('markdown').markdown;

// var favicon = require('favicon');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
// app.use(favicon(__dirname + '/public/favicon.ico'));

// Views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Database connection
var mysql = require('mysql');

if (app.get('port') !== 5000) {
	var connection = mysql.createConnection(process.env.JAWSDB_URL);
}
else {
	const fs = require('fs');
	var password = fs.readFileSync('password.txt').toString();
	console.log(password);
	console.log();

	var connection = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: password,
		database: 'test',
		multiplestatements: true});
}

// When to close the connection?
// Open connection for each query?

// Date / time functions
var moment = require('moment');
var today = moment().format('YYYY-MM-DD');
var tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');

// URL and form parsing
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

// Express helper functions
app.locals.dateFormat = function(obj) { return moment(obj).format("dddd, MMMM Do"); };

// Default page
app.get('/', function(request, response) {
	query_notes(function(err, note_rows, note_fields) {
		query_keywords(note_rows, function(err, note_rows, keyword_rows, keyword_fields) {
			response.render('pages/home', {keyword_rows: keyword_rows, note_rows:note_rows, today: today, tomorrow: tomorrow});
		});
	});
});

app.get('/one_note/', function(request, response) {
	query_note(request.param('note_id'), function(err, note_rows, note_fields) {
		//var note = results[0][0];
		//console.log(note.note);
		query_note_keywords(request.param('note_id'), note_rows, function(err, note_rows, keyword_rows) {
		response.render('pages/one_note',	{note_rows: note_rows, note: markdown.toHTML(note_rows[0].note), keyword_rows: keyword_rows});
	});
	});
});

// Save form to database and reload page
app.post('/', function(request, response) {
	var form_data = {title: request.body.title, summary: request.body.summary, note: request.body.note};
	var query = connection.query('insert into notes set ?', form_data, function(err) {
		query_notes(function(err, note_rows, note_fields) {
			query_keywords(note_rows, function(err, note_rows, keywords_rows, keywords_fields) {
			response.render('pages/home', {keywords_rows: keywords_rows, note_rows:note_rows, today: today, tomorrow: tomorrow});
			});
		});
	});
});

// Start listening
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// Get latest notes
var query_notes = function(callback) {
	var sql = 'select note_id, title, summary, note, created_at, last_updated_at';
		sql += ' from notes ';
		sql += ' order by created_at desc; ';
	connection.query(sql, function(err, note_rows, note_fields) {
		if (err) throw err;
		callback(null, note_rows, note_fields);
	});
	return;
};

// Get details for selected note
var query_note = function(note_id, callback) {
	var sql = 'select note_id, title, summary, note, created_at, last_updated_at';
		sql += ' from notes ';
		sql += ' where note_id =  ' + note_id + ' ;';
	connection.query(sql, function(err, note_rows, note_fields) {
		if (err) throw err;
		console.log(note_rows);
		// console.log(fields);
		callback(null, note_rows, note_fields);
	});
	return;
};

var query_note_keywords = function(note_id, note_rows, callback) {
	var sql = ' select * from note_keywords where note_id = ' + note_id + ' ; ';
	//console.log(sql_1);
	connection.query(sql, function(err, keyword_rows, keyword_fields) {
		if (err) throw err;
		callback(null, note_rows, keyword_rows, keyword_fields);
	});
	return;
}

// Get keywords for drop down list
var query_keywords = function(note_rows, callback) {
	var sql = 'select keyword, importance from note_keywords order by keyword desc; '
	connection.query(sql, function(err, keyword_rows, keyword_fields) {
		if (err) throw err;
		callback(null, note_rows, keyword_rows, keyword_fields);
	});
	return;
};

process.on( 'SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  connection.end();
  // some other closing procedures go here
  process.exit( );
})

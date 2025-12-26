require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Discord OAuth2 Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 * 60 * 24 } // 24 hours
}));
app.use(passport.initialize());
app.use(passport.session());

// View engine setup with proper EJS configuration
const ejs = require('ejs');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', (filePath, options, callback) => {
    ejs.renderFile(filePath, options, {
        root: path.join(__dirname, 'views')
    }, callback);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make bot client available to routes
let discordClient = null;
function setDiscordClient(client) {
    discordClient = client;
    app.locals.client = client;
}

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/login', passport.authenticate('discord'));

app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Import routes
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

app.use('/dashboard', ensureAuthenticated, dashboardRoutes);
app.use('/api', ensureAuthenticated, apiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { user: req.user });
});

function startServer() {
    app.listen(PORT, () => {
        console.log(`Dashboard running on ${process.env.DASHBOARD_URL || `http://localhost:${PORT}`}`);
    });
}

module.exports = { app, startServer, setDiscordClient };

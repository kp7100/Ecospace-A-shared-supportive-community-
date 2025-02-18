const express = require('express');
const session = require('express-session');
const socketio = require('socket.io');
const path = require('path');
const http = require('http');
const moment = require('moment');
const multer = require('multer');
var base64Img = require('base64-img');
const checkFileType = require('../utils/checkFileType.js');
const formatMessage = require('../utils/formatMessage.js');
const matchByBirthday = require('../utils/matchByBirthday');
const matchByInterest = require('../utils/matchByInterest');
const getUserId = require('../utils/getUserId');
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require('../utils/activeUsers');

require('../database/database');
var User = require('../database/models/user.js');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({
    storage: storage,
    limits:{fileSize: 1000000},
    fileFilter: function(req, file, callback) {
        checkFileType(file, callback);
    }
}).single('profilePic');


const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = 5001;

// Set paths to directories
const publicDirectoryPath = path.join(__dirname, '../public');
const viewsPath = path.join(__dirname, '../views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setup static directory to serve
app.use(express.static(publicDirectoryPath));

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'match'
}))

// Setup handlebars engine
app.set('view engine', 'hbs');
app.set('views', viewsPath);

app.get('/', async(req, res) => {
    const { userId } = req.session;
    let user = await User.findById(userId);
    if (userId) {
        res.render('index', { id: userId, user:user });
    }
    else
    {
        res.render('index');
    }
})

app.get('/about', async(req, res) => {
    const { userId } = req.session;
    let user = await User.findById(userId);
    if (userId) {
        res.render('about', { id: userId, user: user });
    }
    else
    {
        res.render('about');
    }
})

app.get('/signup', (req, res) => {
    res.render('signup')
})

app.post('/signup', async (req, res) => {
    var user = new User({
        password: req.body.password, 
        email: req.body.email, 
        username: req.body.username, 
        birthday: req.body.birthday,
        profilePic: "./avatar.png"
    });

    try {
        await user.save();
        res.status(201);
        req.session.userId = user._id;
        res.redirect('/profile');
    } catch (e) {
        res.status(400).send(e);
    }
});
        
app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        console.log(user.username + " has succesfully logged in!");
        req.session.userId = user._id;
        res.redirect('/profile');
    } catch (e) {
        res.redirect('/login');
        res.status(400).send();
    }
})

app.post('/uploads', async(req, res) => {
    const { userId } = req.session;
    var user = await User.findById(userId);
    upload(req, res, (err) => {
        if (err){
            res.send('Error uploading');
        }
        else {
            if (req.file == undefined) {
                res.render('profile', {
                    username: user.username,
                    email: user.email,
                    birthday: moment(user.birthday).format('DD-MM-YYYY')
                });
            }
            else {
                User.findById(user._id, function (err, doc) {
                    doc.profilePic = `./uploads/${req.file.filename}`;
                    doc.save();
                  });
                  
                res.render('profile', {
                    username: user.username,
                    email: user.email,
                    birthday: moment(user.birthday).format('DD-MM-YYYY'),
                    profilePic: base64Img.base64Sync(`./uploads/${req.file.filename}`)
                })
            }
        }
    })
})

app.get('/profile', async (req, res) => {
    const { userId } = req.session;
    var user = await User.findById(userId);
    
    if (!user) {
        res.redirect('/');
    }
    else
    {
        res.render('profile', {
            id: userId,
            username: user.username,
            email: user.email,
            birthday: moment(user.birthday).format('DD-MM-YYYY'),
            profilePic: base64Img.base64Sync(user.profilePic),
            interests: user.interests,
            user: user
        });
    }
    
})

app.post('/profile', async (req, res) => {
    const { userId } = req.session;
    let user = await User.findById(userId);
    user.interests = req.body.profile;
    user.save();
    res.redirect('/profile');
})

app.get('/birthday-matches', async (req, res) => {
    const { userId } = req.session;
    if (userId) {
        let user = await User.findById(userId);
        let matchesByBirthday = await matchByBirthday(user);
        matchesByBirthday.forEach(match => {
            match.profilePic = base64Img.base64Sync(match.profilePic);
        });
        res.render('birthday-matches', {
            matches: matchesByBirthday,
            user: user
        })
    }
})

app.get('/interests-matches', async (req, res) => {
    const { userId } = req.session;
    if (userId) {
        let user = await User.findById(userId);
        matchByInterest(user, (error, intMatches) => {
            intMatches.forEach(element => {
                element.profilePic = base64Img.base64Sync(element.profilePic);
                element.interests = element.interests.slice(0, 3);
            });
            res.render('interests-matches', {
                matches: intMatches,
                user: user
            })
        });
    }
})

app.post('/likes/:id/:int_id', async (req, res) => {
    const { userId } = req.session;
    if (userId) {
        let user = await User.findById(userId);
        let likedUser = await User.findById(req.params.id);
        user.likedUsers.push(req.params.id);
        likedUser.usersThatLikedMe.push(userId);
        user.save().catch(() => console.log('You already liked that user!'));
        likedUser.save().catch(() => console.log('Duplicate of that user found!'));
    }

    if (req.params.int_id == 1) {
        res.redirect('/interests-matches');
    } else {
        res.redirect('/birthday-matches');
    }
})

app.get('/view/profile/:username', async (req, res) => {
    let viewUser = await User.findOne({username: req.params.username});
    res.render('profile', {
        id: viewUser._id,
        username: viewUser.username,
        email: viewUser.email,
        birthday: moment(viewUser.birthday).format('DD-MM-YYYY'),
        profilePic: base64Img.base64Sync(viewUser.profilePic),
        interests: viewUser.interests,
        view: 1
    })
})

var name = "";

app.get('/chatRooms', async(req, res) => {
    const { userId } = req.session;
    if (userId) {
        var user = await User.findById(userId);
        name = user.username;
        res.render('chatRoom', {interest: req.query.room, user: user});
    }
})

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.redirect('/');
        }
        
        res.clearCookie();
        res.redirect('/login');
        console.log("User has succesfully logged out.");

    })
})


app.get('/chat', async (req, res) => {
    const { userId } = req.session;
    if (userId) {
        var user = await User.findById(userId);
        name = user.username;
        res.render('chat', { id: userId, user: user});
    }
    else
    {
        res.render('chat');
    }

})

// io.on('connection', socket => {
//     // socket.username = name;
    
//     socket.emit('message', formatMessage("!Bugs Bunny", 'Welcome!'));
        
//     socket.broadcast.emit('message', formatMessage("!Bugs Bunny",'User has joined!'));

//     socket.on('chatMessage', message => {
//         io.emit('message', formatMessage(socket.username, message));
//     })

//     socket.on('disconnect', () => {
//         io.emit('message', formatMessage("!Bugs Bunny", "User has disconnected"));
//     })

// })


io.on('connection', socket => {
    socket.username = name;
    
    socket.on('joinRoom', ({room}) => {
        const user = userJoin(socket.id, socket.username, room);
    
        socket.join(room);
        socket.emit('message', formatMessage("!Bugs Bunny", 'Welcome!'));  
        socket.broadcast.to(user.room).emit('message', formatMessage("!Bugs Bunny",`${user.username} has joined!`));
    })

    socket.on('chatMessage', message => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit('message', formatMessage(user.username, message));
    })

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit('message', formatMessage("!Bugs Bunny", `${socket.username} has left the chat!`));
        }
    })

})

server.listen(PORT, () => console.log('Server started on port ' + PORT));

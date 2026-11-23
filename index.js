require('dotenv').config({ quiet: true });
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connect = require('./db/dbConnect');

async function main() {
  const db = await connect();
  const app = express();
  const production = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  if (production) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/health', async (req, res) => {
    await db.query('SELECT 1');
    res.type('text').send('ok');
  });
  app.use(express.json({ limit: '180kb' }));
  app.use(express.urlencoded({ extended: true, limit: '180kb' }));
  app.use(cookieParser());
  app.use(session({
    name: 'webboard.sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: production, sameSite: 'lax' }
  }));
  app.use((req, res, next) => {
    res.locals.viewer = req.session.user;
    res.locals.csrf = req.session.csrf;
    res.locals.date = value => {
      const timestamp = value instanceof Date ? value : new Date(value.replace(' ', 'T') + 'Z');
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short'
      }).format(timestamp);
    };
    if (req.method === 'POST' && (!req.session.csrf || req.body?.csrf !== req.session.csrf)) {
      return res.status(403).render('error', { title: '요청을 확인해 주세요', message: '이전 화면을 새로고침한 뒤 다시 시도해 주세요.' });
    }
    next();
  });

  app.use('/users', require('./routes/users')(db));
  app.use('/board', require('./routes/board')(db));
  app.get('/', (req, res) => res.render('home', { title: 'My Web Board' }));
  app.use((req, res) => res.status(404).render('error', { title: '페이지를 찾을 수 없습니다', message: '주소를 확인해 주세요.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status === 413) {
      return res.status(413).render('error', { title: '입력한 내용이 너무 깁니다', message: '내용을 줄여서 다시 시도해 주세요.' });
    }
    console.error(error.code || error.name);
    res.status(500).render('error', { title: '요청을 처리하지 못했습니다', message: '잠시 후 다시 시도해 주세요.' });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => console.log('Web board listening on port', port));
}

main().catch(error => {
  console.error('Server startup failed:', error.code || error.message);
  process.exitCode = 1;
});

const { Router } = require('express');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);

module.exports = ({ query, userTable }) => {
  const router = Router();
  const render = (req, res, register, error = '', status = 200) => {
    req.session.csrf ||= randomBytes(24).toString('hex');
    res.locals.csrf = req.session.csrf;
    res.status(status).render(register ? 'register' : 'account', {
      title: register ? '회원가입' : '로그인',
      error, registered: req.query.registered === '1', values: req.body || {}
    });
  };

  router.get('/reg', (req, res) => render(req, res, true));
  router.get('/login', (req, res) => render(req, res, false));

  router.post('/reg', async (req, res) => {
    const { userid, passwd, name, email } = req.body;
    if (typeof userid !== 'string' || !/^[a-z0-9_]{3,20}$/.test(userid) ||
        typeof passwd !== 'string' || passwd.length < 8 || passwd.length > 128 ||
        typeof name !== 'string' || !name.trim() || name.trim().length > 20 ||
        typeof email !== 'string' || email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return render(req, res, true, '아이디, 비밀번호, 이름, 이메일의 입력 조건을 확인해 주세요.', 400);
    }
    const salt = randomBytes(16).toString('hex');
    const key = await deriveKey(passwd, salt, 32);
    try {
      await query(`INSERT INTO ${userTable} (userid, passwd, name, email, reg_date) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userid, salt + ':' + key.toString('hex'), name.trim(), email]);
    } catch (error) {
      const duplicate = error.code === 'ER_DUP_ENTRY' || error.code === '23505' ||
        (error.code === 'ERR_SQLITE_ERROR' && error.errcode === 1555);
      if (!duplicate) throw error;
      return render(req, res, true, '이미 사용 중인 아이디입니다.', 409);
    }
    res.redirect(303, '/users/login?registered=1');
  });

  router.post('/login', async (req, res, next) => {
    const { userid, passwd } = req.body;
    if (typeof userid !== 'string' || typeof passwd !== 'string' || passwd.length > 128) {
      return render(req, res, false, '아이디 또는 비밀번호를 확인해 주세요.', 400);
    }
    const { rows: [user] } = await query(`SELECT userid, passwd, name FROM ${userTable} WHERE userid = ?`, [userid]);
    const [salt, hash] = user ? user.passwd.split(':') : ['0'.repeat(32), '0'.repeat(64)];
    const key = await deriveKey(passwd, salt, 32);
    if (!timingSafeEqual(key, Buffer.from(hash, 'hex')) || !user) {
      return render(req, res, false, '아이디 또는 비밀번호를 확인해 주세요.', 401);
    }
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.user = { userid: user.userid, name: user.name };
      req.session.csrf = randomBytes(24).toString('hex');
      req.session.save(error => error ? next(error) : res.redirect(303, '/board'));
    });
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('webboard.sid');
      res.redirect(303, '/board');
    });
  });
  return router;
};

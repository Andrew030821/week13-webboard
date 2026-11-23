const { Router } = require('express');

module.exports = ({ query, userTable }) => {
  const router = Router();
  const postSql = `SELECT b.idx, b.userid, b.title, b.content, b.hit, b.reg_date, u.name
    FROM board b JOIN ${userTable} u ON b.userid = u.userid`;
  const login = (req, res, next) => {
    if (!req.session.user) return res.redirect(303, '/users/login');
    next();
  };
  const missing = res => res.status(404).render('error', {
    title: '게시글을 찾을 수 없습니다', message: '게시판에서 글을 다시 선택해 주세요.'
  });
  const forbidden = res => res.status(403).render('error', {
    title: '작성자만 사용할 수 있습니다', message: '이 글을 작성한 계정으로 로그인해 주세요.'
  });
  const fields = body => ({
    title: typeof body.title === 'string' ? body.title.trim() : '',
    content: typeof body.content === 'string' ? body.content.trim() : ''
  });
  const valid = ({ title, content }) => title && title.length <= 256 && content && content.length <= 12000;
  const invalid = '제목은 1~256자, 본문은 1~12,000자로 입력해 주세요.';

  router.param('id', (req, res, next, value) => {
    if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647) return missing(res);
    next();
  });
  router.get('/', async (req, res) => {
    const page = typeof req.query.page === 'string' && /^[1-9]\d{0,6}$/.test(req.query.page) ? Number(req.query.page) : 1;
    const { rows } = await query(`${postSql} ORDER BY b.idx DESC LIMIT 21 OFFSET ?`, [(page - 1) * 20]);
    res.render('list', { title: '게시판', posts: rows.slice(0, 20), page, hasNext: rows.length > 20 });
  });
  router.get('/write', login, (req, res) => {
    res.render('write', { title: '글쓰기', post: {}, error: '', target: '/board/write' });
  });
  router.post('/write', login, async (req, res) => {
    const post = fields(req.body);
    if (!valid(post)) {
      return res.status(400).render('write', { title: '글쓰기', post, error: invalid, target: '/board/write' });
    }
    await query('INSERT INTO board (userid, title, content, reg_ip) VALUES (?, ?, ?, ?)',
      [req.session.user.userid, post.title, post.content, (req.ip || '0.0.0.0').slice(0, 45)]);
    res.redirect(303, '/board');
  });
  router.get('/:id', async (req, res) => {
    await query('UPDATE board SET hit = hit + 1 WHERE idx = ?', [req.params.id]);
    const { rows: [post] } = await query(`${postSql} WHERE b.idx = ?`, [req.params.id]);
    if (!post) return missing(res);
    res.render('detail', { title: post.title, post });
  });
  const owner = async (req, res, next) => {
    const { rows: [post] } = await query(`${postSql} WHERE b.idx = ?`, [req.params.id]);
    if (!post) return missing(res);
    if (post.userid !== req.session.user.userid) return forbidden(res);
    res.locals.post = post;
    next();
  };
  router.get('/:id/edit', login, owner, (req, res) => {
    res.render('write', { title: '글 수정', error: '', target: '/board/' + req.params.id + '/edit' });
  });
  router.post('/:id/edit', login, owner, async (req, res) => {
    const { id } = req.params;
    const post = fields(req.body);
    if (!valid(post)) {
      return res.status(400).render('write', {
        title: '글 수정', post, error: invalid, target: '/board/' + id + '/edit'
      });
    }
    const result = await query('UPDATE board SET title = ?, content = ? WHERE idx = ? AND userid = ?',
      [post.title, post.content, id, req.session.user.userid]);
    if (!result.changes) {
      const { rows } = await query('SELECT idx FROM board WHERE idx = ? AND userid = ?', [id, req.session.user.userid]);
      if (!rows.length) return missing(res);
    }
    res.redirect(303, '/board/' + id);
  });
  router.post('/:id/delete', login, owner, async (req, res) => {
    const result = await query('DELETE FROM board WHERE idx = ? AND userid = ?', [req.params.id, req.session.user.userid]);
    if (!result.changes) return missing(res);
    res.redirect(303, '/board');
  });
  return router;
};

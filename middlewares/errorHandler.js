function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.status === 400) {
    return res.status(400).render('error', {
      title: '잘못된 요청입니다',
      message: '입력 데이터의 형식을 확인해 주세요.'
    });
  }
  if (error.status === 413) {
    return res.status(413).render('error', {
      title: '입력한 내용이 너무 깁니다',
      message: '내용을 줄여서 다시 시도해 주세요.'
    });
  }
  console.error(error.code || error.name);
  return res.status(500).render('error', {
    title: '요청을 처리하지 못했습니다',
    message: '잠시 후 다시 시도해 주세요.'
  });
}

module.exports = errorHandler;

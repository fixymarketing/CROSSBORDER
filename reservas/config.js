window.FIXY_EFFIX_CONFIG = Object.freeze({
  apiBase: ['localhost', '127.0.0.1'].includes(location.hostname)
    ? location.origin
    : 'https://fixy-effix-reservas-e2zceb54ha-rj.a.run.app',
});

export const environment = {
  production: true,
  apiBase: '',
  wsBase: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
};

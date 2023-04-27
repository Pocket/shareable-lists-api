// to be made into a package for easier sharing shortly
import Logger from './logger';
import morgan, { StreamOptions } from 'morgan';

const stream: StreamOptions = {
  write: (message) => Logger.http(message),
};

// if userid header used, inject it into HTTP request logs
morgan.token('req-userid', function (req, _res) {
  const userid: string | string[] = req.headers.userid || null;
  if (userid === null) {
    return null;
  }
  return userid.toString();
});

// basic apache request logging format with our additions at the end
const morganMiddleware = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :req-userid',
  {
    stream: stream,
  }
);

export default morganMiddleware;

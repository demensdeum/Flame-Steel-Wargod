import GameServer from './gameServer';

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
new GameServer(port);
